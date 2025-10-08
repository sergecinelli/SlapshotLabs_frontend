import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthButtonComponent } from '../../../shared/components/auth-button/auth-button';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AuthButtonComponent,
    PageHeaderComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent {
  profileForm: FormGroup;
  
  constructor(private formBuilder: FormBuilder, private router: Router) {
    // Initialize form with prefilled dummy data
    this.profileForm = this.formBuilder.group({
      email: ['john.doe@example.com', [Validators.required, Validators.email]],
      firstName: ['John', [Validators.required, Validators.minLength(2)]],
      lastName: ['Doe', [Validators.required, Validators.minLength(2)]],
      phoneNumber: ['+1234567890', [Validators.required, Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      address: ['123 Main Street, City, State 12345', [Validators.required, Validators.minLength(10)]],
    });
  }

  onSave() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.profileForm.value;
    console.log('Profile update:', {
      email: formValue.email,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      phoneNumber: formValue.phoneNumber,
      address: formValue.address,
      password: formValue.password
    });
    
    // TODO: Implement actual profile update logic
    alert('Profile updated successfully!');
  }

  onResetPassword() {
    // Navigate to forgot password or reset password functionality
    this.router.navigate(['/forgot-password']);
  }

  // Getters for easy access to form controls in template
  get email() {
    return this.profileForm.get('email');
  }

  get firstName() {
    return this.profileForm.get('firstName');
  }

  get lastName() {
    return this.profileForm.get('lastName');
  }

  get phoneNumber() {
    return this.profileForm.get('phoneNumber');
  }

  get address() {
    return this.profileForm.get('address');
  }

  get password() {
    return this.profileForm.get('password');
  }
}
