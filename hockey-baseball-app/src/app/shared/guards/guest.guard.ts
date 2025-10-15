import { Injectable, inject } from '@angular/core';
import { Router, CanActivate } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  private authService = inject(AuthService);
  private router = inject(Router);


  canActivate(): Observable<boolean> {
    return this.authService.getCurrentUser().pipe(
      map(user => {
        if (user) {
          // User is authenticated, redirect to dashboard
          this.router.navigate(['/dashboard']);
          return false;
        } else {
          // User is not authenticated, allow access to auth pages
          return true;
        }
      }),
      catchError(() => {
        // If there's an error, assume user is not authenticated
        return of(true);
      })
    );
  }
}