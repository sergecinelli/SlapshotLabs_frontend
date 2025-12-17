import { Component, inject, OnInit, OnDestroy, signal, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BannerService } from '../../services/banner.service';
import { Subscription } from 'rxjs';
import { BannerSkeletonComponent } from './banner-skeleton.component';

interface GameBannerItem {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_team_name: string;
  away_team_name: string;
  home_team_abbreviation: string | null;
  away_team_abbreviation: string | null;
  date: string; // YYYY-MM-DD
  time: string; // time string from API
  game_type_name: string;
  game_period_name: string | null;
  arena_name: string;
  rink_name: string | null;
  home_goals: number;
  away_goals: number;
  status: number; // 1 = Not Started, 2 = In Progress, 3 = Completed
}

@Component({
  selector: 'app-live-banner',
  standalone: true,
  imports: [CommonModule, BannerSkeletonComponent],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
})
export class BannerComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private bannerService = inject(BannerService);
  private refreshSubscription?: Subscription;
  private elementRef = inject(ElementRef);

  // Toggle test data on/off
  private readonly USE_TEST_DATA = false
  bannerItems = signal<GameBannerItem[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  isScrolled = signal<boolean>(false);
  showSkeleton = signal<boolean>(true);
  private isInitialLoad = true;
  private scrollListener?: () => void;
  private scrollElement?: HTMLElement;

  ngOnInit(): void {
    this.fetchBanner();

    // Subscribe to refresh events
    this.refreshSubscription = this.bannerService.refreshBanner$.subscribe(() => {
      this.isInitialLoad = false; // Mark as not initial load for refresh events
      this.fetchBanner();
    });
  }

  ngAfterViewInit(): void {
    // Wait for view to initialize, then setup scroll listener
    setTimeout(() => {
      this.setupScrollListener();
    }, 100);
  }

  private getTestData(): GameBannerItem[] {
    return [
      // Live game - short names
      // {
      //   id: 9991,
      //   home_team_id: 1,
      //   away_team_id: 2,
      //   home_team_name: 'Toronto Maple Leafs',
      //   away_team_name: 'Montreal Canadiens',
      //   home_team_abbreviation: 'TOR',
      //   away_team_abbreviation: 'MTL',
      //   date: '2024-01-15',
      //   time: '19:30:00',
      //   game_type_name: 'Regular Season',
      //   game_period_name: '2nd Period',
      //   arena_name: 'Scotiabank Arena',
      //   rink_name: 'Rink 1',
      //   home_goals: 3,
      //   away_goals: 2,
      //   status: 2, // In Progress
      // },
      // // Live game - long names
      // {
      //   id: 9992,
      //   home_team_id: 3,
      //   away_team_id: 4,
      //   home_team_name: 'New York Rangers Hockey Club',
      //   away_team_name: 'Boston Bruins Professional Hockey Team',
      //   home_team_abbreviation: 'NYR',
      //   away_team_abbreviation: 'BOS',
      //   date: '2024-01-15',
      //   time: '20:00:00',
      //   game_type_name: 'Playoffs',
      //   game_period_name: '3rd Period',
      //   arena_name: 'Madison Square Garden',
      //   rink_name: 'Main Rink',
      //   home_goals: 5,
      //   away_goals: 4,
      //   status: 2, // In Progress
      // },
      // // Upcoming game - short venue
      // {
      //   id: 9993,
      //   home_team_id: 5,
      //   away_team_id: 6,
      //   home_team_name: 'Chicago Blackhawks',
      //   away_team_name: 'Detroit Red Wings',
      //   home_team_abbreviation: 'CHI',
      //   away_team_abbreviation: 'DET',
      //   date: '2024-01-16',
      //   time: '18:00:00',
      //   game_type_name: 'Regular Season',
      //   game_period_name: null,
      //   arena_name: 'United Center',
      //   rink_name: null,
      //   home_goals: 0,
      //   away_goals: 0,
      //   status: 1, // Not Started
      // },
      // // Upcoming game - long venue name
      // {
      //   id: 9994,
      //   home_team_id: 7,
      //   away_team_id: 8,
      //   home_team_name: 'Vancouver Canucks',
      //   away_team_name: 'Edmonton Oilers',
      //   home_team_abbreviation: 'VAN',
      //   away_team_abbreviation: 'EDM',
      //   date: '2024-01-16',
      //   time: '19:30:00',
      //   game_type_name: 'Regular Season',
      //   game_period_name: null,
      //   arena_name: 'Rogers Arena - Main Ice Surface',
      //   rink_name: 'Practice Rink 2',
      //   home_goals: 0,
      //   away_goals: 0,
      //   status: 1, // Not Started
      // },
      // Completed game - close score
      {
        id: 9995,
        home_team_id: 9,
        away_team_id: 10,
        home_team_name: 'Pittsburgh Penguins',
        away_team_name: 'Washington Capitals',
        home_team_abbreviation: 'PIT',
        away_team_abbreviation: 'WSH',
        date: '2024-01-15',
        time: '17:00:00',
        game_type_name: 'Regular Season',
        game_period_name: 'Final',
        arena_name: 'PPG Paints Arena',
        rink_name: 'Main',
        home_goals: 4,
        away_goals: 3,
        status: 3, // Completed
      },
      // Completed game - blowout
      {
        id: 9996,
        home_team_id: 11,
        away_team_id: 12,
        home_team_name: 'Tampa Bay Lightning',
        away_team_name: 'Florida Panthers',
        home_team_abbreviation: 'TB',
        away_team_abbreviation: 'FLA',
        date: '2024-01-15',
        time: '16:30:00',
        game_type_name: 'Regular Season',
        game_period_name: 'Final',
        arena_name: 'Amalie Arena',
        rink_name: null,
        home_goals: 7,
        away_goals: 1,
        status: 3, // Completed
      },
      // Live game - overtime
      {
        id: 9997,
        home_team_id: 13,
        away_team_id: 14,
        home_team_name: 'Colorado Avalanche',
        away_team_name: 'Dallas Stars',
        home_team_abbreviation: 'COL',
        away_team_abbreviation: 'DAL',
        date: '2024-01-15',
        time: '21:00:00',
        game_type_name: 'Playoffs',
        game_period_name: 'OT',
        arena_name: 'Ball Arena',
        rink_name: 'Rink 1',
        home_goals: 2,
        away_goals: 2,
        status: 2, // In Progress
      },
      // Upcoming game - very long team names
      {
        id: 9998,
        home_team_id: 15,
        away_team_id: 16,
        home_team_name: 'San Jose Sharks Professional Hockey Organization',
        away_team_name: 'Los Angeles Kings Hockey Club',
        home_team_abbreviation: 'SJ',
        away_team_abbreviation: 'LAK',
        date: '2024-01-17',
        time: '22:00:00',
        game_type_name: 'Regular Season',
        game_period_name: null,
        arena_name: 'SAP Center at San Jose',
        rink_name: 'Main Ice Surface',
        home_goals: 0,
        away_goals: 0,
        status: 1, // Not Started
      },
    ];
  }

  ngOnDestroy(): void {
    this.refreshSubscription?.unsubscribe();
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

  fetchBanner(): void {
    this.loading.set(true);
    this.error.set(null);
    // Show skeleton only on initial load, not on refresh
    if (this.isInitialLoad) {
      this.showSkeleton.set(true);
    }
    this.api.get<GameBannerItem[]>('/hockey/game/list/banner').subscribe({
      next: (items) => {
        const realItems = Array.isArray(items) ? items : [];
        // Add test data if enabled
        if (this.USE_TEST_DATA) {
          const testItems = this.getTestData();
          this.bannerItems.set([...testItems, ...realItems]);
        } else {
          this.bannerItems.set(realItems);
        }
        this.loading.set(false);
        this.isInitialLoad = false; // Mark initial load as complete
        
        // Remove skeleton from DOM after fade-out animation completes (0.5s)
        // Hide skeleton regardless of whether there are banner items or not
        if (this.showSkeleton()) {
          setTimeout(() => {
            this.showSkeleton.set(false);
          }, 500); // Match the transition duration
        }
      },
      error: (e) => {
        console.error('Failed to load banner:', e);
        // Show test data on error only if enabled
        if (this.USE_TEST_DATA) {
          const testItems = this.getTestData();
          this.bannerItems.set(testItems);
          this.error.set(null);
          this.loading.set(false);
          this.isInitialLoad = false; // Mark initial load as complete
          
          // Remove skeleton from DOM after fade-out animation completes
          if (this.showSkeleton()) {
            setTimeout(() => {
              this.showSkeleton.set(false);
            }, 500);
          }
        } else {
          this.error.set('Failed to load banner data');
          this.loading.set(false);
          this.isInitialLoad = false; // Mark initial load as complete
          
          // Remove skeleton from DOM after fade-out animation completes
          if (this.showSkeleton()) {
            setTimeout(() => {
              this.showSkeleton.set(false);
            }, 500);
          }
        }
      },
    });
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

  getTimeDisplay(item: GameBannerItem): string {
    // status: 2 = In Progress
    if (item.status === 2) {
      return 'Live';
    }
    // status: 1 = Not Started, format time as 12-hour clock
    if (item.status === 1) {
      return this.formatTimeTo12Hour(item.time);
    }
    return item.time;
  }

  getDateDisplay(dateString: string): string {
    // Parse YYYY-MM-DD format
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
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
