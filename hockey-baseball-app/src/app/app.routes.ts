import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';
import { AuthGuard } from './shared/guards/auth.guard';
import { GuestGuard } from './shared/guards/guest.guard';

export const routes: Routes = [
  // Authentication routes (lazy loaded)
  {
    path: 'sign-in',
    loadComponent: () => import('./components/sign-in/sign-in').then((m) => m.SignInComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./components/sign-up/sign-up').then((m) => m.SignUpComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./components/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./components/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
    canActivate: [GuestGuard],
  },

  // Main application routes with layout
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },

      // Account routes
      { path: 'account', redirectTo: 'account/profile', pathMatch: 'full' },
      {
        path: 'account/profile',
        loadComponent: () =>
          import('./pages/account/profile/profile').then((m) => m.ProfileComponent),
      },
      {
        path: 'account/payment-method',
        loadComponent: () =>
          import('./pages/account/payment-method/payment-method').then(
            (m) => m.PaymentMethodComponent
          ),
      },
      {
        path: 'account/payment-history',
        loadComponent: () =>
          import('./pages/account/payment-history/payment-history').then(
            (m) => m.PaymentHistoryComponent
          ),
      },

      // Other main routes (lazy loaded)
      {
        path: 'goalies',
        loadComponent: () => import('./pages/goalies/goalies').then((m) => m.GoaliesComponent),
      },
      {
        path: 'goalie-profile/:id',
        loadComponent: () =>
          import('./pages/goalie-profile/goalie-profile').then((m) => m.GoalieProfileComponent),
      },
      {
        path: 'spray-chart/:id',
        loadComponent: () =>
          import('./pages/spray-chart/spray-chart').then((m) => m.SprayChartComponent),
      },
      {
        path: 'players',
        loadComponent: () => import('./pages/players/players').then((m) => m.PlayersComponent),
      },
      {
        path: 'player-profile/:id',
        loadComponent: () =>
          import('./pages/player-profile/player-profile').then((m) => m.PlayerProfileComponent),
      },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams').then((m) => m.TeamsComponent),
      },
      {
        path: 'team-profile/:id',
        loadComponent: () =>
          import('./pages/team-profile/team-profile').then((m) => m.TeamProfileComponent),
      },
      {
        path: 'schedule',
        loadComponent: () => import('./pages/schedule/schedule').then((m) => m.ScheduleComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'video-library',
        loadComponent: () =>
          import('./pages/video-library/video-library').then((m) => m.VideoLibraryComponent),
      },
      {
        path: 'highlights',
        loadComponent: () =>
          import('./pages/video-highlights/video-highlights').then(
            (m) => m.VideoHighlightsComponent
          ),
      },
      {
        path: 'gamesheet',
        loadComponent: () =>
          import('./pages/gamesheet/gamesheet').then((m) => m.GamesheetComponent),
      },
      {
        path: 'live-dashboard/:gameId',
        loadComponent: () =>
          import('./pages/live-dashboard/live-dashboard').then((m) => m.LiveDashboardComponent),
      },
    ],
  },

  { path: '**', redirectTo: '/dashboard' },
];
