import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

interface GameBannerItem {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_team_name: string;
  away_team_name: string;
  date: string; // YYYY-MM-DD
  time: string; // time string from API
  game_type_name: string;
  arena_name: string;
  rink_name: string;
  home_goals: number;
  away_goals: number;
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

  bannerItem = signal<GameBannerItem | null>(null);
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
        const item = Array.isArray(items) && items.length > 0 ? items[0] : null;
        this.bannerItem.set(item);
        this.loading.set(false);
      },
      error: (e) => {
        console.error('Failed to load banner:', e);
        this.error.set(null);
        this.loading.set(false);
      }
    });
  }

  goToLiveDashboard(): void {
    this.router.navigate([`/live-dashboard/${this.bannerItem()?.id}`]);
  }
}
