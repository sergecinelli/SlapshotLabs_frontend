import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    AuthButtonComponent,
    AuthLinkComponent,
  ],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.scss'],
})
export class ForgotPasswordComponent implements OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);

  forgotPasswordForm: FormGroup;
  isEmailSent = false;
  isLoading = false;
  errorMessage = '';
  
  // Resend functionality
  canResend = false;
  resendCountdown = 0;
  resendTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnDestroy() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  onSubmit() {
    this.errorMessage = '';
    
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.sendPasswordResetEmail();
  }

  sendPasswordResetEmail() {
    this.isLoading = true;
    const email = this.forgotPasswordForm.get('email')?.value;
    
    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        console.log('Password reset email sent:', response);
        this.isEmailSent = true;
        this.isLoading = false;
        this.startResendTimer();
      },
      error: (error) => {
        console.error('Error sending password reset email:', error);
        this.errorMessage = error.message || 'Failed to send email. Please try again.';
        this.isLoading = false;
      }
    });
  }

  onResendEmail() {
    if (this.canResend) {
      this.sendPasswordResetEmail();
    }
  }

  startResendTimer() {
    this.canResend = false;
    this.resendCountdown = 60; // 60 seconds
    
    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResend = true;
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  navigateToSignIn() {
    this.router.navigate(['/sign-in']);
  }

  // Getter for easy access to email control in template
  get email() {
    return this.forgotPasswordForm.get('email');
  }

  // Get email value for display in success message
  get emailValue() {
    return this.forgotPasswordForm.get('email')?.value || '';
  }
}
