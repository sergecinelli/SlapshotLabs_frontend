import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonLoadingComponent } from '../../../shared/components/buttons/button-loading/button-loading.component';
import { ButtonComponent } from '../../../shared/components/buttons/button/button.component';
import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserProfile, UserEditRequest } from '../../../shared/interfaces/auth.interfaces';
import { getFieldError } from '../../../shared/validators/form-error.util';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, ButtonLoadingComponent, ButtonComponent, FormFieldComponent, LoadingSpinnerComponent],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
})
export class ProfilePage implements OnInit {
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
      postalCode: [''],
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
        },
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
      postalCode: user.postal_code || '',
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
      password: null, // Not using password field in profile
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
      },
    });
  }

  onResetPassword() {
    this.router.navigate(['/forgot-password']);
  }

  private readonly fieldLabels: Record<string, string> = {
    email: 'Email Address',
    firstName: 'First Name',
    lastName: 'Last Name',
    phoneNumber: 'Phone Number',
    country: 'Country',
    city: 'City',
    street: 'Street Address',
    postalCode: 'Postal Code',
  };

  getErrorMessage(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    const label = this.fieldLabels[fieldName] || fieldName;
    return getFieldError(control, label, {
      email: 'Please enter a valid email address',
      minlength: `Min 2 characters`,
    });
  }
}
