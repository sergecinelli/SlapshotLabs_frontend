import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { CsrfTokenService } from '../services/csrf-token.service';
import { environment } from '../../environments/environment';
@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  private csrfTokenService = inject(CsrfTokenService);
  private readonly baseUrl = environment.apiUrl.replace('/api', '');
  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Only apply CSRF token to requests to our API
    if (!request.url.startsWith(this.baseUrl) || this.isPublicEndpoint(request.url)) {
      return next.handle(request);
    }
    // For protected methods, ensure CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return this.handleProtectedRequest(request, next);
    }
    return next.handle(request);
  }
  private handleProtectedRequest(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    const csrfToken = this.csrfTokenService.getCsrfTokenSync();
    if (csrfToken) {
      const csrfRequest = request.clone({
        setHeaders: { 'X-CSRFToken': csrfToken }
      });
      return next.handle(csrfRequest).pipe(
        catchError(error => {
          if (error.status === 403) {
            // CSRF token might be stale, refresh and retry once
            return this.csrfTokenService.refreshCsrfToken().pipe(
              switchMap(newToken => {
                const retryRequest = request.clone({
                  setHeaders: { 'X-CSRFToken': newToken }
                });
                return next.handle(retryRequest);
              }),
              catchError(() => throwError(() => error))
            );
          }
          return throwError(() => error);
        })
      );
    }
    // No token available, get/refresh it first then proceed
    return this.csrfTokenService.refreshCsrfToken().pipe(
      switchMap(token => {
        if (token && token !== '') {
          const csrfRequest = request.clone({
            setHeaders: { 'X-CSRFToken': token }
          });
          return next.handle(csrfRequest);
        }
        return next.handle(request);
      }),
      catchError(() => next.handle(request))
    );
  }
  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = ['/api/openapi.json', '/api/users/csrf'];
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }
}
