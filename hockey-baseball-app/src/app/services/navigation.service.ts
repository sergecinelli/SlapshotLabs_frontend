import { Injectable, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';

export interface NavigationItem {
  label: string;
  path: string;
  children?: NavigationItem[];
  expanded?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private readonly _currentPath = signal<string>('');
  private readonly _navigationItems = signal<NavigationItem[]>([
    {
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      label: 'Account',
      path: '/account',
      expanded: false,
      children: [
        { label: 'Profile', path: '/account/profile' },
        { label: 'Payment Method', path: '/account/payment-method' },
        { label: 'Payment History', path: '/account/payment-history' }
      ]
    },
    {
      label: 'Goalies',
      path: '/goalies'
    },
    {
      label: 'Players',
      path: '/players'
    },
    {
      label: 'Teams',
      path: '/teams'
    },
    {
      label: 'Schedule',
      path: '/schedule'
    },
    {
      label: 'Analytics',
      path: '/analytics'
    },
    {
      label: 'Video Library',
      path: '/video-library'
    }
  ]);

  // Getters for signals
  readonly currentPath = this._currentPath.asReadonly();
  readonly navigationItems = this._navigationItems.asReadonly();

  constructor(private router: Router) {
    // Track current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this._currentPath.set(event.urlAfterRedirects);
        this.updateExpandedState(event.urlAfterRedirects);
      });
    
    // Set initial path
    this._currentPath.set(this.router.url);
    this.updateExpandedState(this.router.url);
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

  private updateExpandedState(currentPath: string): void {
    const items = this._navigationItems();
    const updatedItems = items.map(item => {
      if (item.children && this.isParentActive(item)) {
        return { ...item, expanded: true };
      }
      return item;
    });
    this._navigationItems.set(updatedItems);
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