import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { NavigationService } from '../../../services/navigation.service';
import { BreadcrumbDataService } from '../../../services/breadcrumb-data.service';

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
  private breadcrumbData = inject(BreadcrumbDataService);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  constructor() {
    effect(() => {
      const name = this.breadcrumbData.entityName();
      if (name) {
        this.updateBreadcrumbs();
      }
    });
  }

  ngOnInit(): void {
    this.updateBreadcrumbs();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbData.reset();
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

    if (this.isSchedulesRoute(segments)) {
      this.handleSchedulesRoute(segments, url);
      return;
    }

    if (this.isSprayChartRoute(segments)) {
      this.handleSprayChartRoute(segments, url);
      return;
    }

    if (this.isLiveDashboardRoute(segments)) {
      this.handleLiveDashboardRoute();
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

  private isSchedulesRoute(segments: string[]): boolean {
    return segments.includes('schedule') && segments.includes('teams');
  }

  private handleSchedulesRoute(segments: string[], url: string): void {
    const schedulesIndex = segments.indexOf('schedule');
    const teamId = segments[schedulesIndex - 1];
    const entityName = this.breadcrumbData.entityName();

    const items: BreadcrumbItem[] = [
      {
        label: 'Teams & Rosters',
        path: '/teams-and-rosters',
        icon: this.navigationService.getMaterialIcon('teams'),
      },
      {
        label: 'Teams',
        path: '/teams-and-rosters/teams',
        icon: this.navigationService.getMaterialIcon('teams'),
      },
    ];

    if (entityName && teamId && !isNaN(parseInt(teamId, 10))) {
      items.push({
        label: entityName,
        path: `/teams-and-rosters/teams/${teamId}/profile`,
        icon: 'groups',
      });
    }

    items.push({
      label: 'Schedule',
      path: url,
      icon: 'scoreboard',
    });

    this.breadcrumbs.set(items);
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
    const entityName = this.breadcrumbData.entityName();

    if (!this.isValidEntityId(entityId)) {
      return;
    }

    const items = this.buildBreadcrumbsUpToEntityType(segments, sprayChartIndex);
    const entityType = entityTypeSegment === 'players' ? 'player' : 'goalie';

    this.addEntityTypeBreadcrumb(items, entityType);

    if (entityName) {
      const profilePath = entityType === 'player'
        ? `/teams-and-rosters/players/${entityId}/profile`
        : `/teams-and-rosters/goalies/${entityId}/profile`;
      items.push({
        label: entityName,
        path: profilePath,
        icon: 'person',
      });
    }

    items.push({
      label: 'Spray Chart',
      path: url,
      icon: 'scatter_plot',
    });

    this.breadcrumbs.set(items);
  }

  private handleLiveDashboardRoute(): void {
    const entityName = this.breadcrumbData.entityName();

    const items: BreadcrumbItem[] = [
      {
        label: 'Schedule',
        path: '/schedule',
        icon: this.navigationService.getMaterialIcon('schedule'),
      },
    ];

    if (entityName) {
      items.push({
        label: entityName,
        path: '',
        icon: null,
        isLive: true,
      });
    }

    this.breadcrumbs.set(items);
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
    const profileIndex = segments.findIndex((seg) => seg === 'profile');
    if (profileIndex < 2) {
      this.breadcrumbs.set(items);
      return;
    }

    const entityName = this.breadcrumbData.entityName();
    if (entityName) {
      const parentSegment = segments[profileIndex - 2];
      const icon = parentSegment === 'teams' ? 'groups' : 'person';
      items.push({
        label: entityName,
        path: url,
        icon,
      });
    }

    this.breadcrumbs.set(items);
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
