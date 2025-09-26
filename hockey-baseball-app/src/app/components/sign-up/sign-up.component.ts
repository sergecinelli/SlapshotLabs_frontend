import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDivider,
  ],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
})
export class SignUpComponent {
  signUpForm: FormGroup;
  
  constructor(private router: Router, private formBuilder: FormBuilder) {
    this.signUpForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // Custom validator for password confirmation
  passwordMatchValidator(control: AbstractControl): {[key: string]: boolean} | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }
    
    return password.value !== confirmPassword.value ? { 'passwordMismatch': true } : null;
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.signUpForm.value;
    console.log('Sign up attempt:', {
      email: formValue.email,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      phoneNumber: formValue.phoneNumber,
      password: '***',
      confirmPassword: '***'
    });
    
    // TODO: Implement actual registration logic
    alert('Sign up functionality would be implemented here!');
  }

  navigateToSignIn() {
    this.router.navigate(['/sign-in']);
  }

  // Getters for easy access to form controls in template
  get email() {
    return this.signUpForm.get('email');
  }

  get firstName() {
    return this.signUpForm.get('firstName');
  }

  get lastName() {
    return this.signUpForm.get('lastName');
  }

  get phoneNumber() {
    return this.signUpForm.get('phoneNumber');
  }

  get password() {
    return this.signUpForm.get('password');
  }

  get confirmPassword() {
    return this.signUpForm.get('confirmPassword');
  }
}
