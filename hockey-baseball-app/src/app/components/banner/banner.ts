import { Component, inject, OnInit, OnDestroy, signal, ElementRef, AfterViewInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BannerService, GameBannerItem } from '../../services/banner.service';
import { Subscription } from 'rxjs';
import { BannerSkeletonComponent } from './banner-skeleton.component';

@Component({
  selector: 'app-live-banner',
  standalone: true,
  imports: [CommonModule, BannerSkeletonComponent, RouterLink],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
  animations: [
    trigger('listAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ 
            opacity: 0, 
            transform: 'translateY(-20px)', 
            width: '0px', 
            minWidth: '0px',
            marginRight: '0px', 
            marginLeft: '0px',
            paddingLeft: '0px', 
            paddingRight: '0px', 
            borderLeftWidth: '0px',
            borderRightWidth: '0px',
            overflow: 'hidden'
          }),
          stagger(60, [
            // Smooth expansion without inertia
            animate('350ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
              width: '*', 
              minWidth: '*',
              marginRight: '*',
              marginLeft: '*',
              paddingLeft: '*',
              paddingRight: '*',
              borderLeftWidth: '*',
              borderRightWidth: '*'
            })),
            // Appearance from top to bottom strictly and smoothly
            animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
              opacity: 1, 
              transform: 'translateY(0)' 
            }))
          ])
        ], { optional: true }),
        query(':leave', [
          style({ 
            opacity: 1, 
            transform: 'translateY(0)', 
            width: '*', 
            minWidth: '*', 
            marginRight: '*',
            overflow: 'hidden' 
          }),
          // Card slightly "jumps" before falling down
          animate('300ms cubic-bezier(0.6, -0.28, 0.735, 0.045)', style({ 
            opacity: 0, 
            transform: 'translateY(40px)' 
          })),
          // Collapsing space with inertia effect
          animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
            width: '0px', 
            minWidth: '0px',
            marginRight: '0px', 
            marginLeft: '0px',
            paddingLeft: '0px', 
            paddingRight: '0px', 
            borderLeftWidth: '0px',
            borderRightWidth: '0px'
          }))
        ], { optional: true })
      ])
    ])
  ]
})
export class BannerComponent implements OnInit, OnDestroy, AfterViewInit {
  private router = inject(Router);
  private bannerService = inject(BannerService);
  private elementRef = inject(ElementRef);

  bannerItems = signal<GameBannerItem[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  isScrolled = signal<boolean>(false);
  showSkeleton = signal<boolean>(true);
  
  private subscriptions = new Subscription();
  private scrollListener?: () => void;
  private scrollElement?: HTMLElement;

  ngOnInit(): void {
    // Subscribe to service state
    this.subscriptions.add(
      this.bannerService.bannerItems$.subscribe((items) => {
        const currentItems = this.bannerItems();
        // Only update if data actually changed to avoid unnecessary re-renders/animations
        const isIdentical = currentItems.length === items.length && 
                           currentItems.every((item, index) => item.id === items[index].id && item.status === items[index].status && item.home_goals === items[index].home_goals && item.away_goals === items[index].away_goals);
        
        if (!isIdentical) {
          this.bannerItems.set(items);
        }
      })
    );

    this.subscriptions.add(
      this.bannerService.loading$.subscribe((isLoading) => {
        this.loading.set(isLoading);
        
        if (!isLoading) {
          // Remove skeleton from DOM after fade-out animation completes (0.5s)
          if (this.showSkeleton()) {
            setTimeout(() => {
              this.showSkeleton.set(false);
            }, 500); // Match the transition duration
          }
        }
      })
    );

    this.subscriptions.add(
      this.bannerService.error$.subscribe((err) => {
        this.error.set(err);
      })
    );
  }

  ngAfterViewInit(): void {
    // Wait for view to initialize, then setup scroll listener
    setTimeout(() => {
      this.setupScrollListener();
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.removeScrollListener();
  }

  private setupScrollListener(): void {
    // Find the scrollable main content element
    const mainContent = document.querySelector('.page-content-wrapper') as HTMLElement;

    if (mainContent) {
      this.scrollElement = mainContent;
      this.scrollListener = () => {
        const scrollTop = mainContent.scrollTop;
        const threshold = 50; // Start minimizing after 50px scroll
        this.isScrolled.set(scrollTop > threshold);
      };

      mainContent.addEventListener('scroll', this.scrollListener, { passive: true });
    } else {
      // Fallback to window scroll if main content not found
      this.scrollListener = () => {
        const scrollY = window.scrollY || window.pageYOffset;
        const threshold = 50;
        this.isScrolled.set(scrollY > threshold);
      };

      window.addEventListener('scroll', this.scrollListener, { passive: true });
    }
  }

  private removeScrollListener(): void {
    if (this.scrollListener) {
      if (this.scrollElement) {
        this.scrollElement.removeEventListener('scroll', this.scrollListener);
      } else if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', this.scrollListener);
      }
    }
  }

  goToLiveDashboard(gameId: number): void {
    this.router.navigate([`/schedule/live/${gameId}`]);
  }

  goToTeamProfile(teamId: number): void {
    this.router.navigate([`/teams-and-rosters/teams/team-profile/${teamId}`]);
  }

  onKeyUp(gameId: number): void {
    console.log('Key up event on game card for game ID:', gameId);
  }

  getTeamDisplay(abbreviation: string | null, name: string): string {
    return abbreviation || name;
  }

  getTeamLogoUrl(teamId: number): string {
    return `${environment.apiUrl}/hockey/team/${teamId}/logo`;
  }

  isWinning(item: GameBannerItem, isHomeTeam: boolean): boolean {
    if (item.status !== 2) return false;
    return isHomeTeam ? item.home_goals > item.away_goals : item.away_goals > item.home_goals;
  }

  private formatTimeTo12Hour(time: string): string {
    // Parse time string (assuming format like "17:30:00" or "17:30")
    const timeParts = time.split(':');
    if (timeParts.length < 2) return time;

    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12

    return `${hours}:${minutes} ${ampm}`;
  }

  getAriaLabel(item: GameBannerItem): string {
    const awayTeam = this.getTeamDisplay(item.away_team_abbreviation, item.away_team_name);
    const homeTeam = this.getTeamDisplay(item.home_team_abbreviation, item.home_team_name);
    const status = item.status === 2 ? 'Live' : item.status === 1 ? 'Upcoming' : 'Final';
    return `${status} game: ${awayTeam} ${item.away_goals} - ${item.home_goals} ${homeTeam}`;
  }
}
