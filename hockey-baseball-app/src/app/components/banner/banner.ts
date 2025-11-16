import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

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
  game_period_name: string;
  arena_name: string;
  rink_name: string;
  home_goals: number;
  away_goals: number;
  status: number; // 1 = Not Started, 2 = In Progress, 3 = Completed
}

@Component({
  selector: 'app-live-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './banner.html',
  styleUrl: './banner.scss'
})
export class BannerComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  bannerItems = signal<GameBannerItem[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.fetchBanner();
  }

  fetchBanner(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<GameBannerItem[]>('/hockey/game/list/banner').subscribe({
      next: (items) => {
        this.bannerItems.set(Array.isArray(items) ? items : []);
        this.loading.set(false);
      },
      error: (e) => {
        console.error('Failed to load banner:', e);
        this.error.set(null);
        this.loading.set(false);
      }
    });
  }

  goToLiveDashboard(gameId: number): void {
    this.router.navigate([`/live-dashboard/${gameId}`]);
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
      return 'In Progress';
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
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
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
}
