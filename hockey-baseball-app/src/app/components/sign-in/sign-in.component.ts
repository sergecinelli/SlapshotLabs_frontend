import { Component, OnInit, inject , ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link.component';
import { AuthService } from '../../services/auth.service';
import { UserSignInForm } from '../../shared/interfaces/auth.interfaces';

@Component({
  selector: 'app-sign-in',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    ButtonLoadingComponent,
    AuthLinkComponent,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  signInForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });
  isLoading = false;
  returnUrl = '/dashboard';

  ngOnInit() {
    // Get the return URL from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit() {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const raw = this.signInForm.getRawValue();
    const formValue: UserSignInForm = {
      email: raw.email,
      password: raw.password,
      rememberMe: raw.rememberMe || false,
    };

    this.authService.signIn(formValue).subscribe({
      next: () => {
        this.isLoading = false;
        // this.snackBar.open('Successfully signed in!', 'Close', {
        //   duration: 3000,
        //   panelClass: ['success-snackbar']
        // });
        // Navigate to intended route
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.isLoading = false;
        // this.snackBar.open(
        //   error.message || 'Sign in failed. Please try again.',
        //   'Close',
        //   {
        //     duration: 5000,
        //     panelClass: ['error-snackbar']
        //   }
        // );
        console.error('Sign in error:', error);
      },
    });
  }

  navigateToSignUp() {
    this.router.navigate(['/sign-up']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

  // Getters for easy access to form controls in template
  get email() {
    return this.signInForm.get('email');
  }

  get password() {
    return this.signInForm.get('password');
  }

  get rememberMe() {
    return this.signInForm.get('rememberMe');
  }
}
