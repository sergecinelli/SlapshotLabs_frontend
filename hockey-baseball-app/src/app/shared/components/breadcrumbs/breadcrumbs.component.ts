import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavigationService } from '../../../services/navigation.service';
import { GoalieService } from '../../../services/goalie.service';
import { PlayerService } from '../../../services/player.service';
import { TeamService } from '../../../services/team.service';
import { LiveGameService } from '../../../services/live-game.service';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string | null;
  isLive?: boolean;
  tournamentName?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
})
export class BreadcrumbsComponent implements OnInit {
  private router = inject(Router);
  private navigationService = inject(NavigationService);
  private goalieService = inject(GoalieService);
  private playerService = inject(PlayerService);
  private teamService = inject(TeamService);
  private liveGameService = inject(LiveGameService);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  ngOnInit(): void {
    this.updateBreadcrumbs();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const urlWithoutQuery = url.split('?')[0];
    const segments = urlWithoutQuery.split('/').filter((segment) => segment);

    if (this.isDashboardRoute(segments)) {
      this.setDashboardBreadcrumbs();
      return;
    }

    if (this.isSprayChartRoute(segments)) {
      this.handleSprayChartRoute(segments, url);
      return;
    }

    if (this.isLiveDashboardRoute(segments)) {
      this.handleLiveDashboardRoute(segments);
      return;
    }

    const items = this.buildStandardBreadcrumbs(segments);
    this.handleSpecialRoutes(segments, items, url);
  }

  private isDashboardRoute(segments: string[]): boolean {
    return segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard');
  }

  private setDashboardBreadcrumbs(): void {
    this.breadcrumbs.set([
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: this.navigationService.getMaterialIcon('dashboard'),
      },
    ]);
  }

  private isSprayChartRoute(segments: string[]): boolean {
    const sprayChartIndex = segments.findIndex((seg) => seg === 'spray-chart');
    return sprayChartIndex !== -1 && sprayChartIndex > 1;
  }

  private isLiveDashboardRoute(segments: string[]): boolean {
    const scheduleIndex = segments.findIndex((seg) => seg === 'schedule');
    const liveIndex = segments.findIndex((seg) => seg === 'live');
    return scheduleIndex !== -1 && liveIndex !== -1 && liveIndex === scheduleIndex + 1;
  }

  private handleSprayChartRoute(segments: string[], url: string): void {
    const sprayChartIndex = segments.findIndex((seg) => seg === 'spray-chart');
    const entityId = segments[sprayChartIndex - 1];
    const entityTypeSegment = segments[sprayChartIndex - 2];

    if (!this.isValidEntityId(entityId)) {
      return;
    }

    const items = this.buildBreadcrumbsUpToEntityType(segments, sprayChartIndex);
    const entityType = entityTypeSegment === 'players' ? 'player' : 'goalie';

    this.addEntityTypeBreadcrumb(items, entityType);
    this.loadEntityAndSetBreadcrumbs(entityType, entityId, items, url);
  }

  private handleLiveDashboardRoute(segments: string[]): void {
    const liveIndex = segments.findIndex((seg) => seg === 'live');
    const gameId = segments[liveIndex + 1];

    if (!gameId || isNaN(parseInt(gameId, 10))) {
      // Fallback to standard breadcrumbs if gameId is invalid
      const items = this.buildStandardBreadcrumbs(segments);
      this.breadcrumbs.set(items);
      return;
    }

    // Set initial breadcrumbs: Schedule
    const items: BreadcrumbItem[] = [
      {
        label: 'Schedule',
        path: '/schedule',
        icon: this.navigationService.getMaterialIcon('schedule'),
      },
    ];

    // Set initial breadcrumbs while loading tournament name
    this.breadcrumbs.set(items);

    // Load game data to get tournament name
    this.liveGameService.getGameExtra(parseInt(gameId, 10)).subscribe({
      next: (gameExtra) => {
        const tournamentName = gameExtra.game_type_name || 'Tournament';
        const updatedItems: BreadcrumbItem[] = [
          {
            label: 'Schedule',
            path: '/schedule',
            icon: this.navigationService.getMaterialIcon('schedule'),
          },
          {
            label: tournamentName,
            path: '',
            icon: null,
            isLive: true,
          },
        ];
        this.breadcrumbs.set(updatedItems);
      },
      error: () => {
        // Keep existing breadcrumbs on error (Schedule)
        this.breadcrumbs.set(items);
      },
    });
  }

  private isValidEntityId(entityId: string): boolean {
    return Boolean(entityId && entityId !== 'spray-chart');
  }

  private buildBreadcrumbsUpToEntityType(segments: string[], sprayChartIndex: number): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    const seenLabels = new Set<string>();
    let currentPath = '';

    for (let i = 0; i < sprayChartIndex - 2; i++) {
      const segment = segments[i];
      currentPath += '/' + segment;

      const label = this.navigationService.getPageTitle(currentPath);
      const icon = this.navigationService.getPageIcon(currentPath);

      if (label && !seenLabels.has(label)) {
        seenLabels.add(label);
        items.push({ label, path: currentPath, icon });
      }
    }

    return items;
  }

  private addEntityTypeBreadcrumb(items: BreadcrumbItem[], entityType: 'player' | 'goalie'): void {
    const entityTypePath =
      entityType === 'player' ? '/teams-and-rosters/players' : '/teams-and-rosters/goalies';
    const entityTypeLabel = entityType === 'player' ? 'Players' : 'Goalies';
    const entityTypeIcon =
      entityType === 'player'
        ? this.navigationService.getMaterialIcon('players')
        : this.navigationService.getMaterialIcon('goalies');

    items.push({
      label: entityTypeLabel,
      path: entityTypePath,
      icon: entityTypeIcon,
    });
  }

  private loadEntityAndSetBreadcrumbs(
    entityType: 'player' | 'goalie',
    entityId: string,
    items: BreadcrumbItem[],
    url: string
  ): void {
    if (entityType === 'player') {
      this.loadPlayerAndSetBreadcrumbs(entityId, items, url);
    } else {
      this.loadGoalieAndSetBreadcrumbs(entityId, items, url);
    }
  }

  private loadPlayerAndSetBreadcrumbs(
    entityId: string,
    items: BreadcrumbItem[],
    url: string
  ): void {
    const profilePath = `/teams-and-rosters/players/player-profile/${entityId}`;

    this.playerService.getPlayerById(entityId).subscribe({
      next: (player) => {
        const updatedItems = [...items];
        if (player) {
          updatedItems.push({
            label: `${player.firstName} ${player.lastName}`,
            path: profilePath,
            icon: 'person',
          });
        }
        updatedItems.push({
          label: 'Spray Chart',
          path: url,
          icon: 'scatter_plot',
        });
        this.breadcrumbs.set(updatedItems);
      },
      error: () => {
        items.push({
          label: 'Spray Chart',
          path: url,
          icon: 'scatter_plot',
        });
        this.breadcrumbs.set(items);
      },
    });
  }

  private loadGoalieAndSetBreadcrumbs(
    entityId: string,
    items: BreadcrumbItem[],
    url: string
  ): void {
    const profilePath = `/teams-and-rosters/goalies/goalie-profile/${entityId}`;

    this.goalieService.getGoalieById(entityId).subscribe({
      next: (goalie) => {
        const updatedItems = [...items];
        if (goalie) {
          updatedItems.push({
            label: `${goalie.firstName} ${goalie.lastName}`,
            path: profilePath,
            icon: 'person',
          });
        }
        updatedItems.push({
          label: 'Spray Chart',
          path: url,
          icon: 'scatter_plot',
        });
        this.breadcrumbs.set(updatedItems);
      },
      error: () => {
        items.push({
          label: 'Spray Chart',
          path: url,
          icon: 'scatter_plot',
        });
        this.breadcrumbs.set(items);
      },
    });
  }

  private buildStandardBreadcrumbs(segments: string[]): BreadcrumbItem[] {
    const items: BreadcrumbItem[] = [];
    const seenLabels = new Set<string>();

    segments.reduce((currentPath, segment) => {
      const newPath = currentPath + '/' + segment;
      const label = this.navigationService.getPageTitle(newPath);
      const icon = this.navigationService.getPageIcon(newPath);

      if (label && !seenLabels.has(label)) {
        seenLabels.add(label);
        items.push({ label, path: newPath, icon });
      }

      return newPath;
    }, '');

    if (items.length === 0) {
      items.push({
        label: 'Dashboard',
        path: '/dashboard',
        icon: this.navigationService.getMaterialIcon('dashboard'),
      });
    }

    return items;
  }

  private handleSpecialRoutes(segments: string[], items: BreadcrumbItem[], url: string): void {
    this.addTeamNameFromQueryParams(items, url);
    this.handleProfileRoutes(segments, items, url);
  }

  private addTeamNameFromQueryParams(items: BreadcrumbItem[], url: string): void {
    const urlParts = url.split('?');
    if (urlParts.length > 1) {
      const params = new URLSearchParams(urlParts[1]);
      const teamName = params.get('teamName');
      if (teamName) {
        items.push({
          label: decodeURIComponent(teamName),
          path: url,
          icon: 'groups',
        });
      }
    }
  }

  private handleProfileRoutes(segments: string[], items: BreadcrumbItem[], url: string): void {
    const profileHandlers = [
      { segment: 'goalie-profile', handler: () => this.handleGoalieProfile(segments, items, url) },
      { segment: 'player-profile', handler: () => this.handlePlayerProfile(segments, items, url) },
      { segment: 'team-profile', handler: () => this.handleTeamProfile(segments, items, url) },
    ];

    for (const { segment, handler } of profileHandlers) {
      const index = segments.findIndex((seg) => seg === segment);
      if (index !== -1 && index < segments.length - 1) {
        handler();
        return;
      }
    }

    this.breadcrumbs.set(items);
  }

  private handleGoalieProfile(segments: string[], items: BreadcrumbItem[], url: string): void {
    const goalieId = segments[segments.findIndex((seg) => seg === 'goalie-profile') + 1];
    if (!goalieId) {
      this.breadcrumbs.set(items);
      return;
    }

    this.breadcrumbs.set(items);
    this.goalieService.getGoalieById(goalieId).subscribe({
      next: (goalie) => {
        if (goalie) {
          const updatedItems = [...items];
          updatedItems.push({
            label: `${goalie.firstName} ${goalie.lastName}`,
            path: url,
            icon: 'person',
          });
          this.breadcrumbs.set(updatedItems);
        }
      },
      error: () => {
        // Keep existing breadcrumbs on error
      },
    });
  }

  private handlePlayerProfile(segments: string[], items: BreadcrumbItem[], url: string): void {
    const playerId = segments[segments.findIndex((seg) => seg === 'player-profile') + 1];
    if (!playerId) {
      this.breadcrumbs.set(items);
      return;
    }

    this.breadcrumbs.set(items);
    this.playerService.getPlayerById(playerId).subscribe({
      next: (player) => {
        if (player) {
          const updatedItems = [...items];
          updatedItems.push({
            label: `${player.firstName} ${player.lastName}`,
            path: url,
            icon: 'person',
          });
          this.breadcrumbs.set(updatedItems);
        }
      },
      error: () => {
        // Keep existing breadcrumbs on error
      },
    });
  }

  private handleTeamProfile(segments: string[], items: BreadcrumbItem[], url: string): void {
    const teamId = segments[segments.findIndex((seg) => seg === 'team-profile') + 1];
    if (!teamId) {
      this.breadcrumbs.set(items);
      return;
    }

    this.breadcrumbs.set(items);
    this.teamService.getTeamById(teamId).subscribe({
      next: (team) => {
        if (team) {
          const updatedItems = [...items];
          updatedItems.push({
            label: team.name,
            path: url,
            icon: 'groups',
          });
          this.breadcrumbs.set(updatedItems);
        }
      },
      error: () => {
        // Keep existing breadcrumbs on error
      },
    });
  }

  navigateTo(path: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const pathWithoutQuery = path.split('?')[0];
    const segments = pathWithoutQuery.split('/').filter((segment) => segment);
    this.router.navigate(segments);
  }

  isLast(index: number): boolean {
    return index === this.breadcrumbs().length - 1;
  }
}
