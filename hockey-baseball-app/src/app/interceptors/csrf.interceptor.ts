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
    console.log('🔒 CSRF Interceptor - Processing:', request.method, request.url);
    console.log('🔒 CSRF Interceptor - Base URL:', this.baseUrl);
    console.log('🔒 CSRF Interceptor - URL matches base?', request.url.startsWith(this.baseUrl));
    
    // Only apply CSRF token to requests to our API
    if (!request.url.startsWith(this.baseUrl)) {
      console.log('🔒 CSRF Interceptor - Skipping (external URL)');
      return next.handle(request);
    }

    // Skip CSRF token for requests to /api/users/csrf (the endpoint that sets the token)
    if (request.url.includes('/api/users/csrf')) {
      console.log('🔒 CSRF Interceptor - Skipping CSRF endpoint');
      return next.handle(request);
    }

    // Skip CSRF token for public endpoints (like openapi.json)
    if (this.isPublicEndpoint(request.url)) {
      console.log('🔒 CSRF Interceptor - Skipping public endpoint');
      return next.handle(request);
    }

    // For protected methods, ensure CSRF token
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      console.log('🔒 CSRF Interceptor - Protected method detected, handling...');
      return this.handleProtectedRequest(request, next);
    }
    
    return next.handle(request);
  }

  private handleProtectedRequest(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    console.log('🔒 CSRF Interceptor - handleProtectedRequest called for:', request.url);
    // Try to get CSRF token synchronously first
    const csrfToken = this.csrfTokenService.getCsrfTokenSync();
    console.log('🔒 CSRF Interceptor - Sync token result:', csrfToken ? 'FOUND' : 'NOT FOUND');
    if (csrfToken) {
      console.log('🔒 CSRF Interceptor - Token value:', csrfToken.substring(0, 10) + '...');
    }
    
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
    ];
    
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }
}
