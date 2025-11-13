import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthButtonComponent } from '../../../shared/components/auth-button/auth-button';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserProfile, UserEditRequest } from '../../../shared/interfaces/auth.interfaces';

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
export class ProfileComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  profileForm: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  
  constructor() {
    // Initialize form with empty values - will be populated from API
    this.profileForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phoneNumber: [''],
      country: [''],
      city: [''],
      street: [''],
      postalCode: ['']
    });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // First try to get cached user data
    const currentUser = this.authService.getCurrentUserValue();
    
    if (currentUser) {
      // Use cached data
      this.populateForm(currentUser);
      this.isLoading = false;
    } else {
      // If no cached data, fetch from API
      this.authService.getCurrentUser().subscribe({
        next: (user: UserProfile | null) => {
          if (user) {
            this.populateForm(user);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user profile:', error);
          this.errorMessage = error.message || 'Failed to load profile data.';
          this.isLoading = false;
        }
      });
    }
  }

  private populateForm(user: UserProfile) {
    this.profileForm.patchValue({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phoneNumber: user.phone_number || '',
      country: user.country || '',
      city: user.city || '',
      street: user.street || '',
      postalCode: user.postal_code || ''
    });
  }

  onSave() {
    this.errorMessage = '';
    this.successMessage = '';
    
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    
    this.isSaving = true;
    const formValue = this.profileForm.value;
    
    const updateData: UserEditRequest = {
      email: formValue.email || null,
      first_name: formValue.firstName || null,
      last_name: formValue.lastName || null,
      phone_number: formValue.phoneNumber || null,
      country: formValue.country || null,
      region: null, // Not using region field
      city: formValue.city || null,
      street: formValue.street || null,
      postal_code: formValue.postalCode || null,
      password: null // Not using password field in profile
    };
    
    this.authService.editUser(updateData).subscribe({
      next: () => {
        this.successMessage = 'Profile updated successfully!';
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.errorMessage = error.message || 'Failed to update profile. Please try again.';
        this.isSaving = false;
      }
    });
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

  get country() {
    return this.profileForm.get('country');
  }

  get city() {
    return this.profileForm.get('city');
  }

  get street() {
    return this.profileForm.get('street');
  }

  get postalCode() {
    return this.profileForm.get('postalCode');
  }
}
