import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CsrfTokenService } from './csrf-token.service';
import {
  UserSignUpRequest,
  UserSignInRequest,
  UserProfile,
  UserEditRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  ApiMessage,
  UserRegistrationForm,
  UserSignInForm
} from '../shared/interfaces/auth.interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  // Cache for ongoing API requests to prevent multiple simultaneous calls
  private currentUserRequest$: Observable<UserProfile | null> | null = null;

  constructor(
    private apiService: ApiService,
    private csrfTokenService: CsrfTokenService
  ) {
    // Don't automatically fetch user on initialization
    // Call initializeAuth() manually when needed
  }

  /**
   * Initialize authentication by checking if user is already signed in
   */
  initializeAuth(): Observable<UserProfile | null> {
    return this.getCurrentUser();
  }

  /**
   * Sign up a new user
   */
  signUp(registrationData: UserRegistrationForm): Observable<ApiMessage> {
    const signUpRequest: UserSignUpRequest = {
      email: registrationData.email,
      first_name: registrationData.firstName,
      last_name: registrationData.lastName,
      password: registrationData.password
    };

    return this.apiService.post<ApiMessage>('/users/signup', signUpRequest);
  }

  /**
   * Sign in user
   */
  signIn(signInData: UserSignInForm): Observable<void> {
    const signInRequest: UserSignInRequest = {
      email: signInData.email,
      password: signInData.password,
      remember_me: signInData.rememberMe
    };

    return this.apiService.post<void>('/users/signin', signInRequest).pipe(
      tap(() => {
        // After successful sign-in, get user profile
        this.refreshCurrentUser().subscribe();
      })
    );
  }

  /**
   * Sign out user
   */
  signOut(): Observable<void> {
    return this.apiService.get<void>('/users/signout').pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.csrfTokenService.clearCsrfToken();
      }),
      catchError(() => {
        // Even if sign-out fails, clear local state
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.csrfTokenService.clearCsrfToken();
        return of(undefined);
      })
    );
  }

  /**
   * Get current user profile
   */
  getCurrentUser(): Observable<UserProfile | null> {
    // If we already have user data, return it from cache
    const currentUser = this.currentUserSubject.value;
    if (currentUser) {
      return of(currentUser);
    }

    // If there's already an ongoing request, return that instead of making a new one
    if (this.currentUserRequest$) {
      return this.currentUserRequest$;
    }

    // If no cached user data, fetch from API
    this.currentUserRequest$ = this.apiService.get<UserProfile>('/users/get').pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        this.currentUserRequest$ = null; // Clear the ongoing request
      }),
      catchError((error) => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        this.currentUserRequest$ = null; // Clear the ongoing request
        return of(null);
      }),
      shareReplay(1) // Share the result with all subscribers
    );

    return this.currentUserRequest$;
  }

  /**
   * Edit user profile
   */
  editUser(editData: UserEditRequest): Observable<void> {
    return this.apiService.post<void>('/users/edit', editData).pipe(
      tap(() => {
        // Refresh user data after successful edit
        this.refreshCurrentUser().subscribe();
      })
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<ApiMessage> {
    const resetRequest: PasswordResetRequest = { email };
    return this.apiService.post<ApiMessage>('/users/passwordreset/', resetRequest);
  }

  /**
   * Confirm password reset
   */
  confirmPasswordReset(resetData: PasswordResetConfirm): Observable<ApiMessage> {
    return this.apiService.post<ApiMessage>('/users/passwordresetconfirm/', resetData);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get current user (synchronous)
   */
  getCurrentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  /**
   * Utility method to convert form data to API format
   */
  convertRegistrationFormToApiFormat(formData: UserRegistrationForm): UserSignUpRequest {
    return {
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      password: formData.password
    };
  }

  /**
   * Utility method to convert sign-in form to API format
   */
  convertSignInFormToApiFormat(formData: UserSignInForm): UserSignInRequest {
    return {
      email: formData.email,
      password: formData.password,
      remember_me: formData.rememberMe
    };
  }

  /**
   * Force refresh user data from API (ignores cache)
   */
  refreshCurrentUser(): Observable<UserProfile | null> {
    return this.apiService.get<UserProfile>('/users/get').pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return of(null);
      })
    );
  }

}
