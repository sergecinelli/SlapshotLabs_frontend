import { Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in';
import { SignUpComponent } from './components/sign-up/sign-up';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
import { LayoutComponent } from './components/layout/layout';

// Page Components
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ProfileComponent } from './pages/account/profile/profile';
import { PaymentMethodComponent } from './pages/account/payment-method/payment-method';
import { PaymentHistoryComponent } from './pages/account/payment-history/payment-history';
import { GoaliesComponent } from './pages/goalies/goalies';
import { GoalieProfileComponent } from './pages/goalie-profile/goalie-profile';
import { PlayersComponent } from './pages/players/players';
import { TeamsComponent } from './pages/teams/teams';
import { ScheduleComponent } from './pages/schedule/schedule';
import { AnalyticsComponent } from './pages/analytics/analytics';
import { VideoLibraryComponent } from './pages/video-library/video-library';

export const routes: Routes = [
  // Authentication routes
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  
  // Main application routes with layout
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      
      // Account routes
      { path: 'account', redirectTo: '/account/profile', pathMatch: 'full' },
      { path: 'account/profile', component: ProfileComponent },
      { path: 'account/payment-method', component: PaymentMethodComponent },
      { path: 'account/payment-history', component: PaymentHistoryComponent },
      
      // Other main routes
      { path: 'goalies', component: GoaliesComponent },
      { path: 'goalie-profile/:id', component: GoalieProfileComponent },
      { path: 'players', component: PlayersComponent },
      { path: 'teams', component: TeamsComponent },
      { path: 'schedule', component: ScheduleComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'video-library', component: VideoLibraryComponent },
    ]
  },
  
  { path: '**', redirectTo: '/dashboard' },
];
