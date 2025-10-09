import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { CsrfTokenService } from '../services/csrf-token.service';
import { environment } from '../../environments/environment';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  private readonly baseUrl = environment.apiUrl.replace('/api', '');

  constructor(private csrfTokenService: CsrfTokenService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only apply CSRF token to requests to our API
    if (!request.url.startsWith(this.baseUrl)) {
      return next.handle(request);
    }

    // Skip CSRF token for requests to /api/users/csrf (the endpoint that sets the token)
    if (request.url.includes('/api/users/csrf')) {
      return next.handle(request);
    }

    // Skip CSRF token for public endpoints (like openapi.json)
    if (this.isPublicEndpoint(request.url)) {
      return next.handle(request);
    }

    // For protected methods, ensure CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return this.handleProtectedRequest(request, next);
    }
    
    return next.handle(request);
  }

  private handleProtectedRequest(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Try to get CSRF token synchronously first
    let csrfToken = this.csrfTokenService.getCsrfTokenSync();
    
    if (csrfToken) {
      // Token available, add it and proceed
      const csrfRequest = request.clone({
        setHeaders: {
          'X-CSRFToken': csrfToken
        }
      });
      
      return next.handle(csrfRequest).pipe(
        catchError(error => {
          if (error.status === 403) {
            // CSRF token might be stale, refresh and retry once
            return this.csrfTokenService.initializeCsrfToken().pipe(
              switchMap(newToken => {
                const retryRequest = request.clone({
                  setHeaders: {
                    'X-CSRFToken': newToken
                  }
                });
                return next.handle(retryRequest);
              })
            );
          }
          return throwError(() => error);
        })
      );
    }

    // No token available, initialize it first then proceed
    return this.csrfTokenService.initializeCsrfToken().pipe(
      switchMap(token => {
        const csrfRequest = request.clone({
          setHeaders: {
            'X-CSRFToken': token
          }
        });
        return next.handle(csrfRequest);
      }),
      catchError(error => {
        console.error('Failed to initialize CSRF token:', error);
        // If CSRF initialization fails, proceed without token
        // This allows the backend to return appropriate error
        return next.handle(request);
      })
    );
  }

  /**
   * Check if the endpoint is public and doesn't require CSRF token
   */
  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/api/openapi.json',
      '/api/users/csrf',
      // Add other public endpoints here if needed
    ];
    
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }
}
