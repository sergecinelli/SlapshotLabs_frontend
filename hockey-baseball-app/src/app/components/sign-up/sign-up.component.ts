import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [
    FormsModule,
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
  // Form fields
  email = '';
  firstName = '';
  lastName = '';
  phoneNumber = '';
  password = '';
  confirmPassword = '';

  constructor(private router: Router) {}

  onSubmit() {
    // Basic validation
    if (
      !this.email ||
      !this.firstName ||
      !this.lastName ||
      !this.phoneNumber ||
      !this.password ||
      !this.confirmPassword
    ) {
      alert('Please fill in all required fields.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Password strength validation (minimum 6 characters)
    if (this.password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    console.log('Sign up attempt:', {
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      phoneNumber: this.phoneNumber,
      password: '***',
      confirmPassword: '***',
    });

    // TODO: Implement actual registration logic
    alert('Sign up functionality would be implemented here!');
  }

  navigateToSignIn() {
    this.router.navigate(['/sign-in']);
  }
}
