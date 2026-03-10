import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link.component';
import { ListComponent, IListItem } from '../../shared/components/list/list.component';
import { AuthService } from '../../services/auth.service';
import { UserRegistrationForm } from '../../shared/interfaces/auth.interfaces';

@Component({
  selector: 'app-sign-up',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    ButtonLoadingComponent,
    AuthLinkComponent,
    ListComponent,
  ],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss',
})
export class SignUpComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  signUpForm: FormGroup;
  isLoading = false;

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

  constructor() {
    this.signUpForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[1-9][\d]{0,15}$/)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  // Custom validator for password confirmation
  passwordMatchValidator(control: AbstractControl): Record<string, boolean> | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value !== confirmPassword.value ? { passwordMismatch: true } : null;
  }

  onSubmit() {
    if (this.signUpForm.invalid) {
      this.signUpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue: UserRegistrationForm = {
      email: this.signUpForm.value.email,
      firstName: this.signUpForm.value.firstName,
      lastName: this.signUpForm.value.lastName,
      phoneNumber: this.signUpForm.value.phoneNumber,
      password: this.signUpForm.value.password,
      confirmPassword: this.signUpForm.value.confirmPassword,
    };

    this.authService.signUp(formValue).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        this.router.navigate(['/sign-in'], {
          queryParams: returnUrl ? { returnUrl } : undefined,
        });
      },
      error: (error) => {
        this.isLoading = false;
        // this.snackBar.open(
        //   error.message || 'Registration failed. Please try again.',
        //   'Close',
        //   {
        //     duration: 5000,
        //     panelClass: ['error-snackbar']
        //   }
        // );
        console.error('Sign up error:', error);
      },
    });
  }

  navigateToSignIn() {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.router.navigate(['/sign-in'], {
      queryParams: returnUrl ? { returnUrl } : undefined,
    });
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
