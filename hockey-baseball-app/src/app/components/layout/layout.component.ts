import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import {  } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationService, NavigationItem } from '../../services/navigation.service';
import { IconService } from '../../services/icon.service';
import { AuthService } from '../../services/auth.service';
import { TeamService } from '../../services/team.service';
import { BannerComponent } from '../banner/banner.component';
import { UserProfile } from '../../shared/interfaces/auth.interfaces';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ThemeService } from '../../services/theme.service';
import { Role } from '../../services/roles/role.interface';
import { RoleService } from '../../services/roles/role.service';
import { BreadcrumbsComponent } from '../../shared/components/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, BannerComponent, ButtonLoadingComponent, MatRippleModule, MatTooltipModule, BreadcrumbsComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  host: { '(window:keydown)': 'handleKeyDown($event)' },
})
export class LayoutComponent implements OnInit {
  private navigationService = inject(NavigationService);
  private iconService = inject(IconService);
  private authService = inject(AuthService);
  private teamService = inject(TeamService);
  private roleService = inject(RoleService);
  private router = inject(Router);
  protected themeService = inject(ThemeService);

  protected isCollapsed = signal(false);
  protected currentUser = signal<UserProfile | null>(null);
  protected isLoggingOut = signal(false);
  protected teamName = signal<string | null>(null);

  protected getRippleColor(): string {
    return 'rgba(255, 255, 255, 0.05)';
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser.set(user);
        // Load team name if user is a Coach
        if (user && this.roleService.current === Role.Coach && user.team_id) {
          this.loadTeamName(user.team_id);
        }
      },
      error: () => {
        this.currentUser.set(null);
      },
    });
  }

  private loadTeamName(teamId: number): void {
    this.teamService.getTeamById(teamId.toString()).subscribe({
      next: (team) => {
        if (team) {
          this.teamName.set(team.name);
        }
      },
      error: (error) => {
        console.error('Error loading team name:', error);
        this.teamName.set(null);
      },
    });
  }

  protected getRoleTooltip(): string | null {
    const user = this.currentUser();
    if (!user) return null;

    if (this.roleService.current === Role.Coach && this.teamName()) {
      return `Coach of ${this.teamName()}`;
    }

    return null;
  }

  protected toggleCollapse(): void {
    this.isCollapsed.update(value => !value);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.isContentEditable;
    
    // Skip keyboard shortcuts if typing in input/textarea
    if (isInputElement) {
      return;
    }

    // Shift+T — toggle navigation menu
    if (event.shiftKey && event.code === 'KeyT') {
      event.preventDefault();
      this.toggleCollapse();
      return;
    }

    // Shift+1..9 — navigate to Nth menu item
    const digit = event.code?.replace('Digit', '');
    const index = Number(digit) - 1;
    const items = this.navigationItems();

    if (event.shiftKey && index >= 0 && index < items.length) {
      event.preventDefault();
      this.navigate(items[index].path);
    }
  }

  protected getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';
    const first = user.first_name?.[0] || '';
    const last = user.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  }

  protected getUserFullName(): string {
    const user = this.currentUser();
    if (!user) return 'User';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
  }

  protected get navigationItems() {
    return this.navigationService.navigationItems;
  }

  protected get currentPath() {
    return this.navigationService.currentPath;
  }

  protected get pageTitle() {
    return this.navigationService.getPageTitle(this.currentPath());
  }

  protected toggleSubmenu(item: NavigationItem): void {
    this.navigationService.toggleSubmenu(item);
  }

  protected handleChevronClick(event: Event, item: NavigationItem): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleSubmenu(item);
  }

  protected navigate(path: string): void {
    this.navigationService.navigate(path);
  }

  protected handleNavigationClick(event: MouseEvent, path: string, item?: NavigationItem): void {
    // If item has children, toggle submenu and navigate to first child
    if (item?.children && item.children.length > 0) {
      event.preventDefault();
      // Toggle submenu
      this.toggleSubmenu(item);
      // Navigate to first child
      const firstChildPath = item.children[0].path;
      this.navigate(firstChildPath);
      return;
    }

    // Middle click (button === 1) or Ctrl+Click or Cmd+Click: allow default behavior (opens in new tab)
    if (event.button === 1 || event.ctrlKey || event.metaKey) {
      // Let the browser handle it - opens in new tab
      return;
    }

    // Left click: prevent default and navigate in current window
    event.preventDefault();
    this.navigate(path);
  }

  protected isActive(path: string): boolean {
    return this.navigationService.isActive(path);
  }

  protected isParentActive(item: NavigationItem): boolean {
    return this.navigationService.isParentActive(item);
  }

  protected isItemActive(item: NavigationItem): boolean {
    const currentPath = this.currentPath();
    
    // If item has children, check if any child is active first (same logic as Account)
    if (item.children && item.children.length > 0) {
      // Check if any child path matches current path or current path starts with child path + '/'
      const hasActiveChild = item.children.some((child) => {
        // Exact match
        if (currentPath === child.path) return true;
        // Path starts with child path + '/' (for nested routes like /teams-and-rosters/goalies)
        if (currentPath.startsWith(child.path + '/')) return true;
        return false;
      });
      
      // If any child is active, parent is NOT active
      if (hasActiveChild) return false;
    }
    
    // Item is active only if path exactly matches and no child is active
    return currentPath === item.path;
  }

  protected logout(): void {
    this.isLoggingOut.set(true);
    this.authService.signOut().subscribe({
      next: () => {
        this.isLoggingOut.set(false);
        this.navigationService.navigate('/sign-in');
      },
      error: (error) => {
        console.error('Error during sign out:', error);
        this.isLoggingOut.set(false);
        // Navigate to sign-in anyway as the local state is cleared
        this.navigationService.navigate('/sign-in');
      },
    });
  }

  protected getIconPath(iconName?: string): string {
    return this.iconService.getIconPath(iconName);
  }

  protected getMaterialIcon(iconName: string): string {
    return this.navigationService.getMaterialIcon(iconName) || iconName;
  }

  protected goToProfile(): void {
    this.router.navigate(['/account/profile']);
  }
}
