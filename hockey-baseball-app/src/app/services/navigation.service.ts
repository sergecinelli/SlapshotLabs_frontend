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
  providedIn: 'root'
})
export class NavigationService {
  private router = inject(Router);

  private readonly _currentPath = signal<string>('');
  private readonly _navigationItems = signal<NavigationItem[]>([
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'dashboard'
    },
    {
      label: 'Account',
      path: '/account',
      icon: 'account',
      expanded: false,
      children: [
        { label: 'Profile', path: '/account/profile', icon: 'profile' },
        { label: 'Payment Method', path: '/account/payment-method', icon: 'payment' },
        { label: 'Payment History', path: '/account/payment-history', icon: 'history' }
      ]
    },
    {
      label: 'Goalies',
      path: '/goalies',
      icon: 'goalies'
    },
    {
      label: 'Players',
      path: '/players',
      icon: 'players'
    },
    {
      label: 'Teams',
      path: '/teams',
      icon: 'teams'
    },
    {
      label: 'Schedule',
      path: '/schedule',
      icon: 'schedule'
    },
    {
      label: 'Analytics',
      path: '/analytics',
      icon: 'analytics'
    },
    {
      label: 'Video Library',
      path: '/video-library',
      icon: 'video'
    },
    {
      label: 'Video Highlights',
      path: '/highlights',
      icon: 'highlights'
    },
    /*{
      label: 'Live Dashboard',
      path: '/live-dashboard/10',
      icon: 'live'
    }*/
  ]);

  // Getters for signals
  readonly currentPath = this._currentPath.asReadonly();
  readonly navigationItems = this._navigationItems.asReadonly();

  constructor() {
    // Track current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
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
      const updatedItems = items.map(navItem => {
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
    return item.children.some(child => this.isActive(child.path));
  }

  getPageTitle(path: string): string {
    const flatItems = this.getFlatNavigationItems();
    const activeItem = flatItems.find(item => path.startsWith(item.path));
    return activeItem?.label || 'Dashboard';
  }

  private updateExpandedState(): void {
    const items = this._navigationItems();
    const updatedItems = items.map(item => {
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
    
    items.forEach(item => {
      flatItems.push(item);
      if (item.children) {
        flatItems.push(...item.children);
      }
    });
    
    return flatItems;
  }
}
