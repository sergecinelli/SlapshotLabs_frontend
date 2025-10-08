import { Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in';
import { SignUpComponent } from './components/sign-up/sign-up';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
import { LayoutComponent } from './components/layout/layout.component';

// Page Components
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/account/profile/profile.component';
import { PaymentMethodComponent } from './pages/account/payment-method/payment-method.component';
import { PaymentHistoryComponent } from './pages/account/payment-history/payment-history.component';
import { GoaliesComponent } from './pages/goalies/goalies.component';
import { GoalieProfileComponent } from './pages/goalie-profile/goalie-profile';
import { PlayersComponent } from './pages/players/players.component';
import { TeamsComponent } from './pages/teams/teams.component';
import { ScheduleComponent } from './pages/schedule/schedule.component';
import { AnalyticsComponent } from './pages/analytics/analytics.component';
import { VideoLibraryComponent } from './pages/video-library/video-library.component';

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
