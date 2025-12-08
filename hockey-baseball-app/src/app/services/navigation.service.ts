import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

export interface NavigationItem {
  label: string;
  path: string;
  icon?: string;
  children?: NavigationItem[];
  expanded?: boolean;
  isHovered?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private router = inject(Router);

  private readonly _currentPath = signal<string>('');
  private readonly _navigationItems = signal<NavigationItem[]>(this.getFilteredNavigationItems());

  private getFilteredNavigationItems(): NavigationItem[] {
    const allItems: NavigationItem[] = [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'dashboard',
      },
      {
        label: 'Account',
        path: '/account',
        icon: 'account',
        expanded: false,
        children: [
          { label: 'Profile', path: '/account/profile', icon: 'profile' },
          { label: 'Payment Method', path: '/account/payment-method', icon: 'payment' },
          { label: 'Payment History', path: '/account/payment-history', icon: 'history' },
        ],
      },
      {
        label: 'Teams & Rosters',
        path: '/teams-and-rosters',
        icon: 'teams',
        expanded: false,
        children: [
          { label: 'Teams', path: '/teams-and-rosters/teams', icon: 'teams' },
          { label: 'Players', path: '/teams-and-rosters/players', icon: 'players' },
          { label: 'Goalies', path: '/teams-and-rosters/goalies', icon: 'goalies' },
        ],
      },
      {
        label: 'Schedule',
        path: '/schedule',
        icon: 'schedule',
      },
      {
        label: 'Analytics',
        path: '/analytics',
        icon: 'analytics',
      },
      {
        label: 'Video Library',
        path: '/video-library',
        icon: 'video',
      },
      {
        label: 'Video Highlights',
        path: '/highlights',
        icon: 'highlights',
      },
      {
        label: 'GAMESHEET',
        path: '/gamesheet',
        icon: 'gamesheet',
      },
    ];

    // All pages are accessible to all roles, so no filtering needed
    // If needed in the future, filter items based on role here
    return allItems;
  }

  // Getters for signals
  readonly currentPath = this._currentPath.asReadonly();
  readonly navigationItems = this._navigationItems.asReadonly();

  constructor() {
    // Track current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this._currentPath.set(event.urlAfterRedirects);
        this.updateExpandedState();
      });

    // Set initial path
    this._currentPath.set(this.router.url);
    this.updateExpandedState();
  }

  toggleSubmenu(item: NavigationItem): void {
    if (item.children) {
      const items = this._navigationItems();
      const updatedItems = items.map((navItem) => {
        if (navItem.path === item.path) {
          return { ...navItem, expanded: !navItem.expanded };
        }
        return navItem;
      });
      this._navigationItems.set(updatedItems);
    }
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }

  isActive(path: string): boolean {
    return this._currentPath().startsWith(path);
  }

  isParentActive(item: NavigationItem): boolean {
    if (!item.children) return false;
    return item.children.some((child) => this.isActive(child.path));
  }

  getPageTitle(path: string): string {
    const flatItems = this.getFlatNavigationItems();
    // First, try to find exact match or child items (longer paths first)
    // Sort by path length descending to prioritize more specific paths
    const sortedItems = [...flatItems].sort((a, b) => b.path.length - a.path.length);
    const activeItem = sortedItems.find((item) => path.startsWith(item.path));
    return activeItem?.label || 'Dashboard';
  }

  getPageIcon(path: string): string | null {
    const flatItems = this.getFlatNavigationItems();
    // First, try to find exact match or child items (longer paths first)
    // Sort by path length descending to prioritize more specific paths
    const sortedItems = [...flatItems].sort((a, b) => b.path.length - a.path.length);
    const activeItem = sortedItems.find((item) => path.startsWith(item.path));
    if (!activeItem?.icon) return null;
    
    return this.getMaterialIcon(activeItem.icon);
  }

  getMaterialIcon(iconName: string): string | null {
    // Map navigation icons to material-symbols icons
    const iconMap: Record<string, string> = {
      'dashboard': 'dashboard',
      'account': 'account_circle',
      'profile': 'person',
      'payment': 'credit_card',
      'history': 'history',
      'teams': 'groups',
      'players': 'sports_hockey',
      'goalies': 'shield',
      'schedule': 'event',
      'analytics': 'analytics',
      'video': 'video_library',
      'highlights': 'movie',
      'gamesheet': 'description',
    };
    
    return iconMap[iconName] || null;
  }

  private updateExpandedState(): void {
    const items = this._navigationItems();
    const updatedItems = items.map((item) => {
      if (item.children && this.isParentActive(item)) {
        return { ...item, expanded: true };
      }
      return item;
    });
    this._navigationItems.set(updatedItems);
  }

  updateNavigationItems(items: NavigationItem[]): void {
    this._navigationItems.set(items);
  }

  private getFlatNavigationItems(): NavigationItem[] {
    const items = this._navigationItems();
    const flatItems: NavigationItem[] = [];

    items.forEach((item) => {
      flatItems.push(item);
      if (item.children) {
        flatItems.push(...item.children);
      }
    });

    return flatItems;
  }
}
