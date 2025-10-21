import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class CsrfTokenService {
  private http = inject(HttpClient);
  private readonly csrfUrl = `${environment.apiUrl}/users/csrf`;
  private csrfToken = new BehaviorSubject<string | null>(null);
  private isInitialized = false;
  initializeCsrfToken(): Observable<string> {
    if (this.csrfToken.value && this.isInitialized) {
      return of(this.csrfToken.value);
    }
    const existingToken = this.getCsrfTokenFromCookie();
    if (existingToken) {
      this.csrfToken.next(existingToken);
      this.isInitialized = true;
      return of(existingToken);
    }
    return this.http.post(this.csrfUrl, {}, {
      responseType: 'text',
      observe: 'response',
      withCredentials: true
    }).pipe(
      map(response => {
        let csrfToken = this.getCsrfTokenFromCookie();
        if (!csrfToken) {
          const setCookieHeader = response.headers.get('set-cookie');
          if (setCookieHeader) {
            const csrfMatch = setCookieHeader.match(/csrftoken=([^;\s]+)/);
            if (csrfMatch) {
              csrfToken = csrfMatch[1];
            }
          }
        }
        if (!csrfToken) {
          csrfToken = '';
        }
        this.csrfToken.next(csrfToken);
        this.isInitialized = true;
        return csrfToken;
      }),
      catchError(() => {
        this.csrfToken.next('');
        this.isInitialized = true;
        return of('');
      })
    );
  }
  private getCsrfTokenFromCookie(): string {
    if (typeof document === 'undefined') {
      return '';
    }
    const cookieString = document.cookie;
    if (!cookieString) {
      return '';
    }
    const cookies = cookieString.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken' || name === 'csrf' || name === 'X-CSRFToken') {
        return value ? decodeURIComponent(value) : '';
      }
    }
    return '';
  }
  getCsrfToken(): Observable<string | null> {
    return this.csrfToken.asObservable();
  }
  getCsrfTokenSync(): string | null {
    if (!this.csrfToken.value && typeof document !== 'undefined') {
      const cookieToken = this.getCsrfTokenFromCookie();
      if (cookieToken) {
        this.csrfToken.next(cookieToken);
        this.isInitialized = true;
      }
    }
    return this.csrfToken.value;
  }
  clearCsrfToken(): void {
    this.csrfToken.next(null);
    this.isInitialized = false;
  }
  refreshCsrfToken(): Observable<string> {
    this.clearCsrfToken();
    return this.initializeCsrfToken();
  }
  isTokenInitialized(): boolean {
    return this.isInitialized && !!this.csrfToken.value;
  }
}
