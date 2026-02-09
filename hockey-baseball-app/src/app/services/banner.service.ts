import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subject, interval, Subscription, BehaviorSubject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

export interface GameBannerItem {
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

@Injectable({
  providedIn: 'root',
})
export class BannerService implements OnDestroy {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  // State
  private bannerItemsSubject = new BehaviorSubject<GameBannerItem[]>([]);
  bannerItems$ = this.bannerItemsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(true);
  loading$ = this.loadingSubject.asObservable();

  private errorSubject = new BehaviorSubject<string | null>(null);
  error$ = this.errorSubject.asObservable();

  // For backward compatibility (components can subscribe to this if they need manual refresh notification)
  // But preferably they should just react to bannerItems$
  private refreshBannerSubject = new Subject<void>();
  refreshBanner$ = this.refreshBannerSubject.asObservable();

  private broadcastChannel: BroadcastChannel;
  private isLeader = false;
  private pollingSubscription?: Subscription;
  private abortController = new AbortController();
  
  private isAuthenticated = false;

  constructor() {
    this.broadcastChannel = new BroadcastChannel('game_banner_channel');
    this.setupBroadcastListener();
    
    // Subscribe to auth state
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isAuthenticated = isAuth;
      // If we are currently the leader, start/stop polling based on auth status
      if (this.isLeader) {
        if (isAuth) {
          this.startPolling();
        } else {
          this.stopPolling();
        }
      }
    });

    this.requestLeaderLock();
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.abortController.abort();
    this.broadcastChannel.close();
  }

  /**
   * Trigger a refresh.
   * If leader, fetch immediately and broadcast.
   * If follower, request leader to refresh.
   */
  triggerRefresh(): void {
    this.refreshBannerSubject.next(); // For backward compatibility
    if (this.isLeader) {
      if (this.isAuthenticated) {
        this.fetchBanner();
      }
    } else {
      this.broadcastChannel.postMessage({ type: 'REQUEST_REFRESH' });
    }
  }

  private async requestLeaderLock() {
    if (typeof navigator === 'undefined' || !('locks' in navigator)) {
      console.warn('Web Locks API not supported, falling back to local polling');
      // Fallback: treat as leader
      this.isLeader = true;
      if (this.isAuthenticated) {
        this.startPolling();
      }
      return;
    }

    try {
      await navigator.locks.request('game_banner_leader', async (lock) => {
        // The lock is held while this callback is running.
        // If we are here, we are the leader.
        console.log('BannerService: Acquired leader lock');
        this.isLeader = true;
        
        // Start polling if authenticated
        if (this.isAuthenticated) {
          this.startPolling();
        }

        // Keep the lock held indefinitely until we signal to release it
        await new Promise<void>((resolve) => {
          this.abortController.signal.addEventListener('abort', () => resolve());
        });

        console.log('BannerService: Releasing leader lock');
        this.isLeader = false;
        this.stopPolling();
      });
    } catch (err) {
      console.error('BannerService: Error acquiring lock', err);
      // Fallback behavior if lock fails: treat as leader
      this.isLeader = true;
      if (this.isAuthenticated) {
        this.startPolling();
      }
    }
  }

  private startPolling() {
    // Avoid creating multiple subscriptions
    if (this.pollingSubscription) {
      return;
    }

    console.log('BannerService: Starting polling');
    // Initial fetch
    this.fetchBanner();

    // Poll every 60 seconds
    this.pollingSubscription = interval(60000).subscribe(() => {
      this.fetchBanner();
    });
  }

  private stopPolling() {
    if (this.pollingSubscription) {
      console.log('BannerService: Stopping polling');
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  private fetchBanner() {
    this.loadingSubject.next(true);
    this.api.get<GameBannerItem[]>('/hockey/game/list/banner').subscribe({
      next: (items) => {
        const data = Array.isArray(items) ? items : [];
        this.updateState(data, false, null);
        this.broadcastData(data);
      },
      error: (err) => {
        console.error('Failed to load banner', err);
        this.updateState([], false, 'Failed to load banner data');
      },
    });
  }

  private broadcastData(items: GameBannerItem[]) {
    this.broadcastChannel.postMessage({ type: 'BANNER_UPDATE', data: items });
  }

  private setupBroadcastListener() {
    this.broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'BANNER_UPDATE') {
        // Update local state with data from leader
        this.updateState(event.data.data, false, null);
      } else if (event.data.type === 'REQUEST_REFRESH') {
        // If we are leader, someone requested a refresh
        if (this.isLeader && this.isAuthenticated) {
          this.fetchBanner();
        }
      }
    };
  }

  private updateState(items: GameBannerItem[], loading: boolean, error: string | null) {
    this.bannerItemsSubject.next(items);
    this.loadingSubject.next(loading);
    this.errorSubject.next(error);
  }
}
