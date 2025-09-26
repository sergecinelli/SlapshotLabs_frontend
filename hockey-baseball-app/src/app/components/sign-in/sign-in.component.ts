import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatCardModule,
    MatDivider,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
  // Form fields
  email = '';
  password = '';
  rememberMe = false;

  constructor(private router: Router) {}

  onSubmit() {
    console.log('Sign in attempt:', {
      email: this.email,
      password: '***',
      rememberMe: this.rememberMe,
    });

    // TODO: Implement actual authentication logic
    if (this.email && this.password) {
      alert('Sign in functionality would be implemented here!');
    } else {
      alert('Please fill in all required fields.');
    }
  }

  navigateToSignUp() {
    this.router.navigate(['/sign-up']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }
}
