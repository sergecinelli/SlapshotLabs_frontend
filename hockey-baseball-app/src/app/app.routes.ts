import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
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
import { schedulesPageRolesAccessMap } from './pages/schedules/schedules.role-map';
import { BreadcrumbRouteData } from './shared/components/breadcrumbs/breadcrumbs.component';

// Reusable breadcrumb fragments
const TEAMS_AND_ROSTERS: BreadcrumbRouteData = { label: 'Teams & Rosters', path: '/teams-and-rosters', icon: 'groups' };
const TEAMS: BreadcrumbRouteData = { label: 'Teams', path: '/teams-and-rosters/teams', icon: 'groups' };
const PLAYERS: BreadcrumbRouteData = { label: 'Players', path: '/teams-and-rosters/players', icon: 'sports_hockey' };
const GOALIES: BreadcrumbRouteData = { label: 'Goalies', path: '/teams-and-rosters/goalies', icon: 'shield' };

export const routes: Routes = [
  // Authentication routes (lazy loaded)
  {
    path: 'sign-in',
    loadComponent: () => import('./components/sign-in/sign-in.component').then((m) => m.SignInComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'sign-up',
    loadComponent: () => import('./components/sign-up/sign-up.component').then((m) => m.SignUpComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./components/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    canActivate: [GuestGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./components/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
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
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: dashboardPageRolesAccessMap,
          breadcrumbs: [{ label: 'Dashboard', icon: 'dashboard' }],
        },
      },

      // Account routes
      { path: 'account', redirectTo: 'account/profile', pathMatch: 'full' },
      {
        path: 'account/profile',
        loadComponent: () =>
          import('./pages/account/profile/profile.page').then((m) => m.ProfilePage),
        data: {
          breadcrumbs: [
            { label: 'Account', path: '/account', icon: 'account_circle' },
            { label: 'Profile', icon: 'person' },
          ],
        },
      },
      {
        path: 'account/payment-method',
        loadComponent: () =>
          import('./pages/account/payment-method/payment-method.page').then(
            (m) => m.PaymentMethodPage
          ),
        data: {
          breadcrumbs: [
            { label: 'Account', path: '/account', icon: 'account_circle' },
            { label: 'Payment Method', icon: 'credit_card' },
          ],
        },
      },
      {
        path: 'account/payment-history',
        loadComponent: () =>
          import('./pages/account/payment-history/payment-history.page').then(
            (m) => m.PaymentHistoryPage
          ),
        data: {
          breadcrumbs: [
            { label: 'Account', path: '/account', icon: 'account_circle' },
            { label: 'Payment History', icon: 'history' },
          ],
        },
      },

      // Teams & Rosters routes
      { path: 'teams-and-rosters', redirectTo: 'teams-and-rosters/teams', pathMatch: 'full' },
      {
        path: 'teams',
        loadComponent: () => import('./pages/teams/teams.page').then((m) => m.TeamsPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: teamsPageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, { label: 'Teams', icon: 'groups' }],
        },
      },
      {
        path: 'teams-and-rosters/teams',
        loadComponent: () => import('./pages/teams/teams.page').then((m) => m.TeamsPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: teamsPageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, { label: 'Teams', icon: 'groups' }],
        },
      },
      {
        path: 'teams/players',
        loadComponent: () => import('./pages/players/players.page').then((m) => m.PlayersPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: playersPageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, PLAYERS, { label: ':queryTeamName', icon: 'groups' }],
        },
      },
      {
        path: 'teams-and-rosters/players',
        loadComponent: () => import('./pages/players/players.page').then((m) => m.PlayersPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: playersPageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, PLAYERS, { label: ':queryTeamName', icon: 'groups' }],
        },
      },
      {
        path: 'teams/goalies',
        loadComponent: () => import('./pages/goalies/goalies.page').then((m) => m.GoaliesPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: goaliesPageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, GOALIES, { label: ':queryTeamName', icon: 'groups' }],
        },
      },
      {
        path: 'teams-and-rosters/goalies',
        loadComponent: () => import('./pages/goalies/goalies.page').then((m) => m.GoaliesPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: goaliesPageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, GOALIES, { label: ':queryTeamName', icon: 'groups' }],
        },
      },
      {
        path: 'teams-and-rosters/players/:id/profile',
        loadComponent: () =>
          import('./pages/player-profile/player-profile.page').then((m) => m.PlayerProfilePage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: playerProfilePageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, PLAYERS, { label: ':entityName', icon: 'person' }],
        },
      },
      {
        path: 'teams-and-rosters/goalies/:id/profile',
        loadComponent: () =>
          import('./pages/goalie-profile/goalie-profile.page').then((m) => m.GoalieProfilePage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: goalieProfilePageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, GOALIES, { label: ':entityName', icon: 'person' }],
        },
      },
      {
        path: 'teams-and-rosters/teams/:id/profile',
        loadComponent: () =>
          import('./pages/team-profile/team-profile.page').then((m) => m.TeamProfilePage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: teamProfilePageRolesAccessMap,
          breadcrumbs: [TEAMS_AND_ROSTERS, TEAMS, { label: ':entityName', icon: 'groups' }],
        },
      },
      {
        path: 'teams-and-rosters/players/:id/spray-chart',
        loadComponent: () =>
          import('./pages/spray-chart/spray-chart.page').then((m) => m.SprayChartPage),
        data: {
          breadcrumbs: [
            TEAMS_AND_ROSTERS,
            PLAYERS,
            { label: ':entityName', path: '/teams-and-rosters/players/:id/profile', icon: 'person' },
            { label: 'Spray Chart', icon: 'scatter_plot' },
          ],
        },
      },
      {
        path: 'teams-and-rosters/goalies/:id/spray-chart',
        loadComponent: () =>
          import('./pages/spray-chart/spray-chart.page').then((m) => m.SprayChartPage),
        data: {
          breadcrumbs: [
            TEAMS_AND_ROSTERS,
            GOALIES,
            { label: ':entityName', path: '/teams-and-rosters/goalies/:id/profile', icon: 'person' },
            { label: 'Spray Chart', icon: 'scatter_plot' },
          ],
        },
      },
      {
        path: 'teams-and-rosters/teams/:id/schedule',
        loadComponent: () => import('./pages/schedules/schedules.page').then((m) => m.SchedulesPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: schedulesPageRolesAccessMap,
          breadcrumbs: [
            TEAMS_AND_ROSTERS,
            TEAMS,
            { label: ':entityName', path: '/teams-and-rosters/teams/:id/profile', icon: 'groups' },
            { label: 'Schedule', icon: 'scoreboard' },
          ],
        },
      },

      // Schedule routes
      {
        path: 'schedule',
        loadComponent: () => import('./pages/schedule/schedule.page').then((m) => m.SchedulePage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: schedulePageRolesAccessMap,
          breadcrumbs: [{ label: 'Schedule', icon: 'event' }],
        },
      },

      // Analytics routes
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: analyticsPageRolesAccessMap,
          breadcrumbs: [{ label: 'Analytics', icon: 'analytics' }],
        },
      },

      // Video routes
      {
        path: 'video-library',
        loadComponent: () =>
          import('./pages/video-library/video-library.page').then((m) => m.VideoLibraryPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: videoLibraryPageRolesAccessMap,
          breadcrumbs: [{ label: 'Video Library', icon: 'video_library' }],
        },
      },
      {
        path: 'highlights',
        loadComponent: () =>
          import('./pages/video-highlights/video-highlights.page').then(
            (m) => m.VideoHighlightsPage
          ),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: videoHighlightsPageRolesAccessMap,
          breadcrumbs: [{ label: 'Video Highlights', icon: 'movie' }],
        },
      },

      // Gamesheet routes
      {
        path: 'gamesheet',
        loadComponent: () =>
          import('./pages/gamesheet/gamesheet.page').then((m) => m.GamesheetPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: gamesheetPageRolesAccessMap,
          breadcrumbs: [{ label: 'GAMESHEET', icon: 'description' }],
        },
      },

      // Live Dashboard routes
      {
        path: 'schedule/live/:gameId',
        loadComponent: () =>
          import('./pages/live-dashboard/live-dashboard.page').then((m) => m.LiveDashboardPage),
        canActivate: [RoleAccessGuard],
        data: {
          pageRolesAccessMap: liveDashboardPageRolesAccessMap,
          breadcrumbs: [
            { label: 'Schedule', path: '/schedule', icon: 'event' },
            { label: ':entityName', isLive: true },
          ],
        },
      },
    ],
  },

  { path: '**', redirectTo: '/dashboard' },
];
