import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link.component';
import { ListComponent, IListItem } from '../../shared/components/list/list.component';
import { AuthService } from '../../services/auth.service';
import { PasswordResetConfirm } from '../../shared/interfaces/auth.interfaces';

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    ButtonLoadingComponent,
    AuthLinkComponent,
    ListComponent,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  protected readonly features: IListItem[] = [
    {
      key: 'analytics',
      icon: 'bar_chart',
      name: 'Player & Team Analytics',
      secondDescription: 'Advanced performance metrics and trends',
    },
    {
      key: 'dashboard',
      icon: 'sports_hockey',
      name: 'Live Game Dashboard',
      secondDescription: 'Real-time scores and play-by-play tracking',
    },
    {
      key: 'video',
      icon: 'videocam',
      name: 'Video Library & Highlights',
      secondDescription: 'Review game footage and key moments',
    },
    {
      key: 'spray-charts',
      icon: 'scatter_plot',
      name: 'Spray Charts',
      secondDescription: 'Visual shot placement and scoring patterns',
    },
    {
      key: 'schedules',
      icon: 'calendar_month',
      name: 'Game Schedules',
      secondDescription: 'Upcoming games, venues, and game types',
    },
    {
      key: 'rosters',
      icon: 'groups',
      name: 'Team & Player Rosters',
      secondDescription: 'Manage teams, players, and goalies',
    },
    {
      key: 'gamesheets',
      icon: 'description',
      name: 'Gamesheets',
      secondDescription: 'Detailed game logs with shots, penalties, and faceoffs',
    },
    {
      key: 'tryouts',
      icon: 'assignment_ind',
      name: 'Tryout Management',
      secondDescription: 'Evaluate and track player tryout performance',
    },
  ];

  resetPasswordForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  uidb64 = '';
  token = '';

  constructor() {
    this.resetPasswordForm = this.formBuilder.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit() {
    // Get token and uidb64 from URL parameters
    this.route.queryParams.subscribe((params) => {
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
      new_password_confirm: formValue.confirmPassword,
    };

    this.authService.confirmPasswordReset(resetData).subscribe({
      next: () => {
        alert('Password has been reset successfully!');
        this.isLoading = false;
        // Navigate to sign-in page after successful reset
        this.router.navigate(['/sign-in']);
      },
      error: (error) => {
        console.error('Password reset failed:', error);
        this.errorMessage = error.message || 'Failed to reset password. Please try again.';
        this.isLoading = false;
      },
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
    return this.resetPasswordForm.hasError('passwordMismatch') && this.confirmPassword?.touched;
  }
}
