import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, switchMap } from 'rxjs/operators';
import { CsrfTokenService } from './csrf-token.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private csrfTokenService: CsrfTokenService
  ) {}

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
  post<T>(endpoint: string, body: any, includeCredentials = true): Observable<T> {
    return this.http.post<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      this.getHttpOptions(includeCredentials)
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generic PUT request
   */
  put<T>(endpoint: string, body: any, includeCredentials = true): Observable<T> {
    return this.http.put<T>(
      `${this.baseUrl}${endpoint}`,
      body,
      this.getHttpOptions(includeCredentials)
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
   * Get the base API URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
