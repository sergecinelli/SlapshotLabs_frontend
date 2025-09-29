import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    AuthButtonComponent,
    AuthLinkComponent,
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent {
  resetPasswordForm: FormGroup;
  
  constructor(private router: Router, private formBuilder: FormBuilder) {
    this.resetPasswordForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
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
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const formValue = this.resetPasswordForm.value;
    console.log('Reset password attempt:', {
      password: '***'
    });
    
    // TODO: Implement actual password reset logic
    alert('Password has been reset successfully!');
    
    // Navigate to sign-in page after successful reset
    this.router.navigate(['/sign-in']);
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
