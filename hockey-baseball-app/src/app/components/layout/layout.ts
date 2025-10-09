import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavigationService, NavigationItem } from '../../services/navigation.service';
import { IconService } from '../../services/icon.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent {
  constructor(
    private navigationService: NavigationService,
    private iconService: IconService,
    private authService: AuthService
  ) {}

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

  protected navigate(path: string): void {
    this.navigationService.navigate(path);
  }

  protected isActive(path: string): boolean {
    return this.navigationService.isActive(path);
  }

  protected isParentActive(item: NavigationItem): boolean {
    return this.navigationService.isParentActive(item);
  }

  protected logout(): void {
    this.authService.signOut().subscribe({
      next: () => {
        console.log('Successfully signed out');
        this.navigationService.navigate('/sign-in');
      },
      error: (error) => {
        console.error('Error during sign out:', error);
        // Navigate to sign-in anyway as the local state is cleared
        this.navigationService.navigate('/sign-in');
      }
    });
  }

  protected getIconPath(iconName?: string): string {
    return this.iconService.getIconPath(iconName);
  }
}
