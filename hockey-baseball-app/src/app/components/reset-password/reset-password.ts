import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button';
import { AuthService } from '../../services/auth.service';
import { PasswordResetConfirm } from '../../shared/interfaces/auth.interfaces';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    AuthButtonComponent,
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  resetPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  uidb64 = '';
  token = '';
  
  constructor() {
    this.resetPasswordForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Get token and uidb64 from URL parameters
    this.route.queryParams.subscribe(params => {
      this.uidb64 = params['uidb64'] || '';
      this.token = params['token'] || '';
      
      if (!this.uidb64 || !this.token) {
        this.errorMessage = 'Invalid reset link. Please request a new password reset.';
      }
    });
  }

  // Custom validator to check if passwords match
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    this.errorMessage = '';
    
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    if (!this.uidb64 || !this.token) {
      this.errorMessage = 'Invalid reset link. Please request a new password reset.';
      return;
    }

    this.isLoading = true;
    const formValue = this.resetPasswordForm.value;
    
    const resetData: PasswordResetConfirm = {
      uidb64: this.uidb64,
      token: this.token,
      new_password: formValue.password,
      new_password_confirm: formValue.confirmPassword
    };
    
    this.authService.confirmPasswordReset(resetData).subscribe({
      next: (response) => {
        alert('Password has been reset successfully!');
        this.isLoading = false;
        // Navigate to sign-in page after successful reset
        this.router.navigate(['/sign-in']);
      },
      error: (error) => {
        console.error('Password reset failed:', error);
        this.errorMessage = error.message || 'Failed to reset password. Please try again.';
        this.isLoading = false;
      }
    });
  }

  navigateToSignIn() {
    this.router.navigate(['/sign-in']);
  }

  // Getters for easy access to form controls in template
  get password() {
    return this.resetPasswordForm.get('password');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  get hasPasswordMismatch() {
    return this.resetPasswordForm.hasError('passwordMismatch') && 
           this.confirmPassword?.touched;
  }
}
