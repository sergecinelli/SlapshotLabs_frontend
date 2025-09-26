import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';
import { EmailService } from '../../services/email.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDivider,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnDestroy {
  email = '';
  isEmailSent = false;
  isLoading = false;
  errorMessage = '';

  // Resend functionality
  canResend = false;
  resendCountdown = 0;
  resendTimer: any;

  constructor(
    private router: Router,
    private emailService: EmailService
  ) {}

  ngOnDestroy() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  onSubmit() {
    this.errorMessage = '';

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }

    this.sendPasswordResetEmail();
  }

  sendPasswordResetEmail() {
    this.isLoading = true;

    this.emailService.sendPasswordResetEmail(this.email).subscribe({
      next: (response) => {
        console.log('Password reset email sent:', response);
        this.isEmailSent = true;
        this.isLoading = false;
        this.startResendTimer();
      },
      error: (error) => {
        console.error('Error sending password reset email:', error);
        this.errorMessage = 'Failed to send email. Please try again.';
        this.isLoading = false;
      },
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
}
