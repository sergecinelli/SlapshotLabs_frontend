import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';
import { AuthGuard } from './shared/guards/auth.guard';
import { GuestGuard } from './shared/guards/guest.guard';
import { RoleAccessGuard } from './shared/guards/role-access.guard';
import { dashboardPageRolesAccessMap } from './pages/dashboard/dashboard.role-map';
import { teamsPageRolesAccessMap } from './pages/teams/teams.role-map';
import { playersPageRolesAccessMap } from './pages/players/players.role-map';
import { goaliesPageRolesAccessMap } from './pages/goalies/goalies.role-map';
import { schedulePageRolesAccessMap } from './pages/schedule/schedule.role-map';
import { liveDashboardPageRolesAccessMap } from './pages/live-dashboard/live-dashboard.role-map';
import { videoHighlightsPageRolesAccessMap } from './pages/video-highlights/video-highlights.role-map';
import { videoLibraryPageRolesAccessMap } from './pages/video-library/video-library.role-map';
import { analyticsPageRolesAccessMap } from './pages/analytics/analytics.role-map';
import { gamesheetPageRolesAccessMap } from './pages/gamesheet/gamesheet.role-map';
import { playerProfilePageRolesAccessMap } from './pages/player-profile/player-profile.role-map';
import { goalieProfilePageRolesAccessMap } from './pages/goalie-profile/goalie-profile.role-map';
import { teamProfilePageRolesAccessMap } from './pages/team-profile/team-profile.role-map';

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
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: dashboardPageRolesAccessMap,
        },
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

      // Teams routes
      { path: 'teams-and-rosters', redirectTo: 'teams-and-rosters/teams', pathMatch: 'full' },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams').then((m) => m.TeamsComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: teamsPageRolesAccessMap,
        },
      },
      {
        path: 'teams-and-rosters/teams',
        loadComponent: () => import('./pages/teams/teams').then((m) => m.TeamsComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: teamsPageRolesAccessMap,
        },
      },
      {
        path: 'teams/players',
        loadComponent: () => import('./pages/players/players').then((m) => m.PlayersComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: playersPageRolesAccessMap,
        },
      },
      {
        path: 'teams/goalies',
        loadComponent: () => import('./pages/goalies/goalies').then((m) => m.GoaliesComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: goaliesPageRolesAccessMap,
        },
      },
      {
        path: 'teams-and-rosters/players',
        loadComponent: () => import('./pages/players/players').then((m) => m.PlayersComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: playersPageRolesAccessMap,
        },
      },
      {
        path: 'teams-and-rosters/goalies',
        loadComponent: () => import('./pages/goalies/goalies').then((m) => m.GoaliesComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: goaliesPageRolesAccessMap,
        },
      },
      {
        path: 'player-profile/:id',
        loadComponent: () => import('./pages/player-profile/player-profile').then((m) => m.PlayerProfileComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: playerProfilePageRolesAccessMap,
        },
      },
      {
        path: 'goalie-profile/:id',
        loadComponent: () => import('./pages/goalie-profile/goalie-profile').then((m) => m.GoalieProfileComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: goalieProfilePageRolesAccessMap,
        },
      },
      {
        path: 'spray-chart/:id',
        loadComponent: () => import('./pages/spray-chart/spray-chart').then((m) => m.SprayChartComponent),
      },
      {
        path: 'teams-and-rosters/teams/team-profile/:id',
        loadComponent: () =>
          import('./pages/team-profile/team-profile').then((m) => m.TeamProfileComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: teamProfilePageRolesAccessMap,
        },
      },
      {
        path: 'schedule',
        loadComponent: () => import('./pages/schedule/schedule').then((m) => m.ScheduleComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: schedulePageRolesAccessMap,
        },
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics').then((m) => m.AnalyticsComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: analyticsPageRolesAccessMap,
        },
      },
      {
        path: 'video-library',
        loadComponent: () =>
          import('./pages/video-library/video-library').then((m) => m.VideoLibraryComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: videoLibraryPageRolesAccessMap,
        },
      },
      {
        path: 'highlights',
        loadComponent: () =>
          import('./pages/video-highlights/video-highlights').then(
            (m) => m.VideoHighlightsComponent
          ),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: videoHighlightsPageRolesAccessMap,
        },
      },
      {
        path: 'gamesheet',
        loadComponent: () =>
          import('./pages/gamesheet/gamesheet').then((m) => m.GamesheetComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: gamesheetPageRolesAccessMap,
        },
      },
      {
        path: 'live-dashboard/:gameId',
        loadComponent: () =>
          import('./pages/live-dashboard/live-dashboard').then((m) => m.LiveDashboardComponent),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: liveDashboardPageRolesAccessMap,
        },
      },
    ],
  },

  { path: '**', redirectTo: '/dashboard' },
];
