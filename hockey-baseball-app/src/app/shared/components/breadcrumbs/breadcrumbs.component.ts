import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { NavigationService } from '../../../services/navigation.service';

export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: string | null;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './breadcrumbs.component.html',
  styleUrl: './breadcrumbs.component.scss',
})
export class BreadcrumbsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private navigationService = inject(NavigationService);

  breadcrumbs = signal<BreadcrumbItem[]>([]);

  ngOnInit(): void {
    this.updateBreadcrumbs();
    
    // Update breadcrumbs on route change
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const items: BreadcrumbItem[] = [];

    // Parse URL segments
    const segments = url.split('/').filter(segment => segment);
    
    // If no segments or just dashboard, show only Dashboard
    if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
      items.push({
        label: 'Dashboard',
        path: '/dashboard',
        icon: this.navigationService.getMaterialIcon('dashboard'),
      });
      this.breadcrumbs.set(items);
      return;
    }

    // Build breadcrumb path
    let currentPath = '';
    for (const segment of segments) {
      currentPath += '/' + segment;
      
      // Get label and icon from navigation service
      const label = this.navigationService.getPageTitle(currentPath);
      const icon = this.navigationService.getPageIcon(currentPath);

      // Only add if we have a valid label (not empty)
      if (label) {
        items.push({
          label,
          path: currentPath,
          icon,
        });
      }
    }

    // If no items were added, add Dashboard as fallback
    if (items.length === 0) {
      items.push({
        label: 'Dashboard',
        path: '/dashboard',
        icon: this.navigationService.getMaterialIcon('dashboard'),
      });
    }

    this.breadcrumbs.set(items);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  isLast(index: number): boolean {
    return index === this.breadcrumbs().length - 1;
  }
}

