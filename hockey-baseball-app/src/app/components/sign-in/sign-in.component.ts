import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { AuthButtonComponent } from '../../shared/components/auth-button/auth-button.component';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    AuthButtonComponent,
    AuthLinkComponent,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
  signInForm: FormGroup;
  
  constructor(private router: Router, private formBuilder: FormBuilder) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit() {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }

    const formValue = this.signInForm.value;
    console.log('Sign in attempt:', {
      email: formValue.email,
      password: '***',
      rememberMe: formValue.rememberMe
    });
    
    // TODO: Implement actual authentication logic
    alert('Sign in functionality would be implemented here!');
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
