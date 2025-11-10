import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { CsrfTokenService } from './csrf-token.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private csrfTokenService = inject(CsrfTokenService);

  /**
   * Get HTTP options with proper headers for cookie-based authentication
   */
  private getHttpOptions(includeCredentials = true) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return {
      headers,
      withCredentials: includeCredentials // This enables sending/receiving cookies
    };
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error && error.error.errors) {
        // Handle validation errors
        const validationErrors = Object.entries(error.error.errors)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage = `Validation errors: ${validationErrors}`;
      } else {
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      }
    }

    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      error: error.error
    }));
  }

  /**
   * Generic GET request
   */
  get<T>(endpoint: string, includeCredentials = true): Observable<T> {
    return this.http.get<T>(
      `${this.baseUrl}${endpoint}`,
      this.getHttpOptions(includeCredentials)
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Generic POST request
   */
  post<T>(endpoint: string, body: unknown, includeCredentials = true): Observable<T> {
    return this.http.post<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      this.getHttpOptions(includeCredentials)
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * POST request with multipart/form-data (for file uploads)
   */
  postMultipart<T>(endpoint: string, formData: FormData, includeCredentials = true): Observable<T> {
    const headers = new HttpHeaders({
      'Accept': 'application/json'
      // Don't set Content-Type for FormData - let browser set it with boundary
    });

    const options = {
      headers,
      withCredentials: includeCredentials
    };

    return this.http.post<T>(
      `${this.baseUrl}${endpoint}`,
      formData,
      options
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generic PUT request
   */
  put<T>(endpoint: string, body: unknown, includeCredentials = true): Observable<T> {
    return this.http.put<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      this.getHttpOptions(includeCredentials)
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generic PATCH request
   */
  patch<T>(endpoint: string, body: unknown, includeCredentials = true): Observable<T> {
    return this.http.patch<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      this.getHttpOptions(includeCredentials)
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PATCH request with multipart/form-data (for file uploads)
   */
  patchMultipart<T>(endpoint: string, formData: FormData, includeCredentials = true): Observable<T> {
    console.log('patchMultipart called with FormData:', formData);
    console.log('FormData instanceof FormData:', formData instanceof FormData);
    
    const headers = new HttpHeaders({
      'Accept': 'application/json'
      // Don't set Content-Type for FormData - let browser set it with boundary
    });

    const options = {
      headers,
      withCredentials: includeCredentials
    };

    console.log('Making PATCH request to:', `${this.baseUrl}${endpoint}`);
    console.log('Request options:', options);

    return this.http.patch<T>(
      `${this.baseUrl}${endpoint}`,
      formData,
      options
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generic DELETE request
   */
  delete<T>(endpoint: string, includeCredentials = true): Observable<T> {
    return this.http.delete<T>(
      `${this.baseUrl}${endpoint}`,
      this.getHttpOptions(includeCredentials)
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Initialize CSRF token (call this before making authenticated requests)
   */
  initializeCsrfToken(): Observable<string> {
    return this.csrfTokenService.initializeCsrfToken();
  }

  /**
   * Check if CSRF token is initialized
   */
  isCsrfTokenInitialized(): boolean {
    return this.csrfTokenService.isTokenInitialized();
  }

  /**
   * Clear CSRF token (useful for logout)
   */
  clearCsrfToken(): void {
    this.csrfTokenService.clearCsrfToken();
  }

  /**
   * Refresh CSRF token (useful for logout and login)
   */
  refreshCsrfToken(): Observable<string> {
    return this.csrfTokenService.refreshCsrfToken();
  }

  /**
   * Get the base API URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
