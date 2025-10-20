import { Routes } from '@angular/router';
import { SignInComponent } from './components/sign-in/sign-in';
import { SignUpComponent } from './components/sign-up/sign-up';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { ResetPasswordComponent } from './components/reset-password/reset-password';
import { LayoutComponent } from './components/layout/layout';
import { AuthGuard } from './shared/guards/auth.guard';
import { GuestGuard } from './shared/guards/guest.guard';

// Page Components
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ProfileComponent } from './pages/account/profile/profile';
import { PaymentMethodComponent } from './pages/account/payment-method/payment-method';
import { PaymentHistoryComponent } from './pages/account/payment-history/payment-history';
import { GoaliesComponent } from './pages/goalies/goalies';
import { GoalieProfileComponent } from './pages/goalie-profile/goalie-profile';
import { PlayersComponent } from './pages/players/players';
import { PlayerProfileComponent } from './pages/player-profile/player-profile';
import { TeamsComponent } from './pages/teams/teams';
import { TeamProfileComponent } from './pages/team-profile/team-profile';
import { ScheduleComponent } from './pages/schedule/schedule';
import { AnalyticsComponent } from './pages/analytics/analytics';
import { VideoLibraryComponent } from './pages/video-library/video-library';

export const routes: Routes = [
  // Authentication routes
  { path: 'sign-in', component: SignInComponent, canActivate: [GuestGuard] },
  { path: 'sign-up', component: SignUpComponent, canActivate: [GuestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [GuestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [GuestGuard] },
  
  // Main application routes with layout
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      
      // Account routes
      { path: 'account', redirectTo: 'account/profile', pathMatch: 'full' },
      { path: 'account/profile', component: ProfileComponent },
      { path: 'account/payment-method', component: PaymentMethodComponent },
      { path: 'account/payment-history', component: PaymentHistoryComponent },
      
      // Other main routes
      { path: 'goalies', component: GoaliesComponent },
      { path: 'goalie-profile/:id', component: GoalieProfileComponent },
      { path: 'players', component: PlayersComponent },
      { path: 'player-profile/:id', component: PlayerProfileComponent },
      { path: 'teams', component: TeamsComponent },
      { path: 'team-profile/:id', component: TeamProfileComponent },
      { path: 'schedule', component: ScheduleComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'video-library', component: VideoLibraryComponent },
    ]
  },
  
  { path: '**', redirectTo: '/dashboard' },
];
