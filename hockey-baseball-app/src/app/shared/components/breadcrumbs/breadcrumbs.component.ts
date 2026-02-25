import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { BreadcrumbDataService } from '../../../services/breadcrumb-data.service';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string | null;
  isLive?: boolean;
  tournamentName?: string;
}

export interface BreadcrumbRouteData {
  label: string;
  path?: string;
  icon?: string;
  isLive?: boolean;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbsComponent {
  private router = inject(Router);
  private title = inject(Title);
  private breadcrumbData = inject(BreadcrumbDataService);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  constructor() {
    effect(() => {
      const name = this.breadcrumbData.entityName();
      if (name) {
        this.updateBreadcrumbs();
      }
    });

    this.updateBreadcrumbs();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbData.reset();
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs(): void {
    const route = this.getDeepestRoute();
    const snapshot = route.snapshot;

    if (!snapshot) return;

    const config = snapshot.data['breadcrumbs'] as BreadcrumbRouteData[] | undefined;

    if (!config) {
      this.breadcrumbs.set([]);
      return;
    }

    const params = snapshot.params;
    const queryParams = snapshot.queryParams;
    const entityName = this.breadcrumbData.entityName();
    const url = this.router.url;

    const items: BreadcrumbItem[] = [];

    for (const item of config) {
      let label = item.label;

      if (label === ':entityName') {
        if (!entityName) continue;
        label = entityName;
      } else if (label === ':queryTeamName') {
        const teamName = queryParams['teamName'];
        if (!teamName) continue;
        label = teamName;
      }

      let path = item.path ?? url;
      for (const [key, value] of Object.entries(params)) {
        path = path.replace(`:${key}`, value);
      }

      items.push({
        label,
        path,
        icon: item.icon ?? null,
        isLive: item.isLive,
      });
    }

    this.breadcrumbs.set(items);
    this.updateDocumentTitle(items);
  }

  private updateDocumentTitle(items: BreadcrumbItem[]): void {
    if (items.length === 0) return;

    if (items.length === 1) {
      this.title.setTitle(items[0].label);
    } else {
      const secondToLast = items[items.length - 2].label;
      const last = items[items.length - 1].label;
      this.title.setTitle(`${secondToLast} | ${last}`);
    }
  }

  private getDeepestRoute(): ActivatedRoute {
    let route = this.router.routerState.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
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
