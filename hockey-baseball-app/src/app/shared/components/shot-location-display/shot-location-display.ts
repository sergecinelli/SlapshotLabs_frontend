import { Component, input, computed, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';

export interface ShotLocationData {
  iceTopOffset: number;
  iceLeftOffset: number;
  netTopOffset?: number | null;
  netLeftOffset?: number | null;
  index: number;
  eventId?: number;
  eventTypeLabel?: string;
  playerName?: string;
  teamName?: string;
  timeLabel?: string;
  periodLabel?: string;
  description?: string;
  tooltip?: string;
  type:
    | 'Goal'
    | 'Save'
    | 'Scoring Chance'
    | 'Penalty'
    | 'Turnover'
    | 'Blocked'
    | 'Missed'
    | 'PP Goal'
    | 'SH Goal'
    | 'Faceoff';
}

interface TypeStats {
  count: number;
  color: string;
}

@Component({
  selector: 'app-shot-location-display',
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './shot-location-display.html',
  styleUrl: './shot-location-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'shot-location-display',
  },
})
export class ShotLocationDisplayComponent {
  data = input.required<ShotLocationData[]>();
  storageKey = input<string>('shotLocationFilters');
  teamId = input<number>();
  teamName = input<string>();
  goalieId = input<number>();
  goalieName = input<string>();
  showGoalieName = input<boolean>(true); // Show goalie name by default
  attackingDirection = input<'left' | 'right'>('right');
  showDirection = input<boolean>(false);
  visibleTypes = signal<Set<ShotLocationData['type']>>(new Set());
  private isInitialized = signal(false);
  goaliePhotoLoaded = signal(true); // Start as true, will be set to false on error
  teamLogoLoaded = signal(true); // Start as true, will be set to false on error

  constructor() {
    // Load filters from local storage once storageKey is available
    effect(() => {
      const key = this.storageKey();
      if (!this.isInitialized()) {
        this.loadFiltersFromStorage(key);
        this.isInitialized.set(true);
      }
    });

    // Save filters to local storage whenever they change (but only after initialization)
    effect(() => {
      if (this.isInitialized()) {
        const filters = Array.from(this.visibleTypes());
        const key = this.storageKey();
        localStorage.setItem(key, JSON.stringify(filters));
      }
    });

    // Reset goalie photo loaded state when goalieId changes
    effect(() => {
      const goalieId = this.goalieId();
      if (goalieId) {
        this.goaliePhotoLoaded.set(true); // Try to load the new photo
      }
    });

    // Reset team logo loaded state when teamId changes
    effect(() => {
      const teamId = this.teamId();
      if (teamId) {
        this.teamLogoLoaded.set(true); // Try to load the new logo
      }
    });
  }

  private readonly typeColors: Record<ShotLocationData['type'], string> = {
    Goal: '#22c55e',
    Save: '#3b82f6',
    'Scoring Chance': '#f59e0b',
    Penalty: '#ef4444',
    Turnover: '#8b5cf6',
    Blocked: '#f97316',
    Missed: '#64748b',
    'PP Goal': '#10b981',
    'SH Goal': '#06b6d4',
    Faceoff: '#ec4899',
  };

  private readonly typePlurals: Record<ShotLocationData['type'], string> = {
    Goal: 'Goals',
    Save: 'Saves',
    'Scoring Chance': 'Scoring Chances',
    Penalty: 'Penalties',
    Turnover: 'Turnovers',
    Blocked: 'Blocked',
    Missed: 'Misses',
    'PP Goal': 'PP Goals',
    'SH Goal': 'SH Goals',
    Faceoff: 'Faceoffs',
  };

  stats = computed(() => {
    const data = this.data();
    const statsMap = new Map<ShotLocationData['type'], TypeStats>();
    const visible = this.visibleTypes();

    data.forEach((item) => {
      const existing = statsMap.get(item.type);
      if (existing) {
        existing.count++;
      } else {
        statsMap.set(item.type, {
          count: 1,
          color: this.typeColors[item.type],
        });
      }
    });

    return Array.from(statsMap.entries()).map(([type, stats]) => ({
      type,
      label: this.typePlurals[type],
      isVisible: visible.has(type),
      ...stats,
    }));
  });

  rinkItems = computed(() => {
    const visible = this.visibleTypes();
    const filtered = this.data()
      .filter((item) => visible.has(item.type))
      .filter((item) => !(item.iceTopOffset === 0 && item.iceLeftOffset === 0));

    return filtered.map((item) => ({
      ...item,
      color: this.typeColors[item.type],
      tooltip: item.tooltip || this.buildTooltip(item),
    }));
  });

  netItems = computed(() => {
    const visible = this.visibleTypes();
    const filtered = this.data()
      .filter((item) => item.netTopOffset != null && item.netLeftOffset != null)
      .filter((item) => !(item.netTopOffset === 0 && item.netLeftOffset === 0))
      .filter((item) => visible.has(item.type));

    return filtered.map((item) => ({
      ...item,
      color: this.typeColors[item.type],
      tooltip: item.tooltip || this.buildTooltip(item),
    }));
  });

  toggleType(type: ShotLocationData['type']): void {
    const current = new Set(this.visibleTypes());
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    this.visibleTypes.set(current);
  }

  getTeamLogoUrl(): string {
    const teamId = this.teamId();
    return teamId ? `${environment.apiUrl}/hockey/team/${teamId}/logo` : '';
  }

  getGoalieLogoUrl = computed(() => {
    const goalieId = this.goalieId();
    return goalieId ? `${environment.apiUrl}/hockey/goalie/${goalieId}/photo` : '';
  });

  buildTooltip(item: ShotLocationData): string {
    const lines = [`#${item.index} — ${item.eventTypeLabel || item.type}`];
    if (item.playerName) {
      lines.push(`Player: ${item.playerName}`);
    }
    if (item.teamName) {
      lines.push(`Team: ${item.teamName}`);
    }
    if (item.timeLabel) {
      lines.push(`Time: ${item.timeLabel}`);
    }
    if (item.periodLabel) {
      lines.push(`Period: ${item.periodLabel}`);
    }
    if (item.description) {
      lines.push(item.description);
    }
    return lines.join('\n');
  }

  private loadFiltersFromStorage(key: string): void {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const filters = JSON.parse(stored) as ShotLocationData['type'][];
        this.visibleTypes.set(new Set(filters));
      } else {
        // By default, show all types
        this.visibleTypes.set(
          new Set([
            'Goal',
            'Save',
            'Scoring Chance',
            'Penalty',
            'Turnover',
            'Blocked',
            'Missed',
            'PP Goal',
            'SH Goal',
            'Faceoff',
          ])
        );
      }
    } catch {
      // If there's an error parsing, default to showing all types
      this.visibleTypes.set(
        new Set([
          'Goal',
          'Save',
          'Scoring Chance',
          'Penalty',
          'Turnover',
          'Blocked',
          'Missed',
          'PP Goal',
          'SH Goal',
          'Faceoff',
        ])
      );
    }
  }

  onGoaliePhotoError(): void {
    this.goaliePhotoLoaded.set(false);
  }

  onGoaliePhotoLoad(): void {
    this.goaliePhotoLoaded.set(true);
  }

  onTeamLogoError(): void {
    this.teamLogoLoaded.set(false);
  }

  onTeamLogoLoad(): void {
    this.teamLogoLoaded.set(true);
  }

  getGoalieInitials(): string {
    const name = this.goalieName();
    if (!name) return 'G';
    
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'G';
    
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    
    return (first + last).toUpperCase() || 'G';
  }

  getTeamInitials(): string {
    const name = this.teamName();
    if (!name) return 'T';
    
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'T';
    
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    const first = parts[0]?.[0] || '';
    const last = parts[parts.length - 1]?.[0] || '';
    
    return (first + last).toUpperCase() || 'T';
  }
}
