import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthLayoutComponent } from '../../shared/components/auth-layout/auth-layout.component';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { AuthLinkComponent } from '../../shared/components/auth-link/auth-link.component';
import { ListComponent, IListItem } from '../../shared/components/list/list.component';
import { AuthService } from '../../services/auth.service';
import { UserSignInForm } from '../../shared/interfaces/auth.interfaces';

@Component({
  selector: 'app-sign-in',
  imports: [
    ReactiveFormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    AuthLayoutComponent,
    ButtonLoadingComponent,
    AuthLinkComponent,
    ListComponent,
  ],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  private authService = inject(AuthService);

  signInForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });
  isLoading = false;
  showPassword = false;
  returnUrl = '/dashboard';

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

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  onSubmit() {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const raw = this.signInForm.getRawValue();
    const formValue: UserSignInForm = {
      email: raw.email,
      password: raw.password,
      rememberMe: raw.rememberMe || false,
    };

    this.authService.signIn(formValue).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Sign in error:', error);
      },
    });
  }

  navigateToSignUp() {
    this.router.navigate(['/sign-up']);
  }

  navigateToForgotPassword() {
    this.router.navigate(['/forgot-password']);
  }

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
