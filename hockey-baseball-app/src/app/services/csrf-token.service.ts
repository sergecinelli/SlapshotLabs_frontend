import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CsrfTokenService {
  private readonly csrfUrl = `${environment.apiUrl}/users/csrf`;
  private csrfToken = new BehaviorSubject<string | null>(null);
  private isInitialized = false;

  constructor(private http: HttpClient) {}

  /**
   * Initialize CSRF token by making a request to /api/users/csrf
   */
  initializeCsrfToken(): Observable<string> {
    if (this.csrfToken.value && this.isInitialized) {
      return this.csrfToken.asObservable().pipe(
        map(token => token!)
      );
    }

    return this.http.post(this.csrfUrl, {}, {
      responseType: 'text',
      observe: 'response'
    }).pipe(
      map(response => {
        // Try to get CSRF token from document.cookie (client-side)
        // Since browsers handle cookie setting automatically, we should read from document.cookie
        let csrfToken = '';
        if (typeof document !== 'undefined') {
          csrfToken = this.getCsrfTokenFromCookie();
        }
        
        // If still not found, try to extract from response headers (less reliable in browsers)
        if (!csrfToken) {
          const cookies = response.headers.get('set-cookie');
          if (cookies) {
            const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
            if (csrfMatch) {
              csrfToken = csrfMatch[1];
            }
          }
        }

        if (!csrfToken) {
          throw new Error('CSRF token not found. Please ensure your backend is setting the csrftoken cookie.');
        }

        this.csrfToken.next(csrfToken);
        this.isInitialized = true;
        return csrfToken;
      }),
      catchError(error => {
        console.error('Failed to initialize CSRF token:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get CSRF token from browser cookies
   */
  private getCsrfTokenFromCookie(): string {
    if (typeof document === 'undefined') {
      return '';
    }

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      // Django uses 'csrftoken' by default, but some configurations might use 'csrf'
      if (name === 'csrftoken' || name === 'csrf') {
        return decodeURIComponent(value || '');
      }
    }
    return '';
  }

  /**
   * Get the current CSRF token
   */
  getCsrfToken(): Observable<string | null> {
    return this.csrfToken.asObservable();
  }

  /**
   * Get the current CSRF token synchronously
   */
  getCsrfTokenSync(): string | null {
    // Try to get from cookie if not initialized
    if (!this.csrfToken.value && typeof document !== 'undefined') {
      const cookieToken = this.getCsrfTokenFromCookie();
      if (cookieToken) {
        this.csrfToken.next(cookieToken);
        this.isInitialized = true;
      }
    }
    return this.csrfToken.value;
  }

  /**
   * Clear the CSRF token (useful for logout)
   */
  clearCsrfToken(): void {
    this.csrfToken.next(null);
    this.isInitialized = false;
  }

  /**
   * Check if CSRF token is initialized
   */
  isTokenInitialized(): boolean {
    return this.isInitialized && !!this.csrfToken.value;
  }
}
