import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDivider
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnDestroy {
  forgotPasswordForm: FormGroup;
  isEmailSent = false;
  isLoading = false;
  errorMessage = '';
  
  // Resend functionality
  canResend = false;
  resendCountdown = 0;
  resendTimer: any;

  constructor(
    private router: Router, 
    private emailService: EmailService,
    private formBuilder: FormBuilder
  ) {
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
    
    this.emailService.sendPasswordResetEmail(email).subscribe({
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