import { Component, input, computed, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ShotLocationData {
  iceTopOffset: number;
  iceLeftOffset: number;
  netTopOffset?: number | null;
  netLeftOffset?: number | null;
  type: 'Goal' | 'Save' | 'Scoring Chance' | 'Penalty' | 'Turnover' | 'Blocked' | 'Missed' | 'PP Goal' | 'SH Goal' | 'Faceoff';
}

interface TypeStats {
  count: number;
  color: string;
}

@Component({
  selector: 'app-shot-location-display',
  imports: [CommonModule],
  templateUrl: './shot-location-display.html',
  styleUrl: './shot-location-display.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'shot-location-display'
  }
})
export class ShotLocationDisplayComponent {
  data = input.required<ShotLocationData[]>();
  storageKey = input<string>('shotLocationFilters');
  visibleTypes = signal<Set<ShotLocationData['type']>>(new Set());
  private isInitialized = signal(false);

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
  }

  private readonly typeColors: Record<ShotLocationData['type'], string> = {
    'Goal': '#22c55e',
    'Save': '#3b82f6',
    'Scoring Chance': '#f59e0b',
    'Penalty': '#ef4444',
    'Turnover': '#8b5cf6',
    'Blocked': '#f97316',
    'Missed': '#64748b',
    'PP Goal': '#10b981',
    'SH Goal': '#06b6d4',
    'Faceoff': '#ec4899'
  };

  private readonly typePlurals: Record<ShotLocationData['type'], string> = {
    'Goal': 'Goals',
    'Save': 'Saves',
    'Scoring Chance': 'Scoring Chances',
    'Penalty': 'Penalties',
    'Turnover': 'Turnovers',
    'Blocked': 'Blocked',
    'Missed': 'Misses',
    'PP Goal': 'PP Goals',
    'SH Goal': 'SH Goals',
    'Faceoff': 'Faceoffs'
  };

  stats = computed(() => {
    const data = this.data();
    const statsMap = new Map<ShotLocationData['type'], TypeStats>();
    const visible = this.visibleTypes();

    data.forEach(item => {
      const existing = statsMap.get(item.type);
      if (existing) {
        existing.count++;
      } else {
        statsMap.set(item.type, {
          count: 1,
          color: this.typeColors[item.type]
        });
      }
    });

    return Array.from(statsMap.entries()).map(([type, stats]) => ({
      type,
      label: this.typePlurals[type],
      isVisible: visible.has(type),
      ...stats
    }));
  });

  rinkItems = computed(() => {
    const visible = this.visibleTypes();
    const filtered = this.data()
      .filter(item => visible.has(item.type))
      .filter(item => !(item.iceTopOffset === 0 && item.iceLeftOffset === 0));
    
    // Add sequential numbering per type
    const counters = new Map<ShotLocationData['type'], number>();
    return filtered.map(item => {
      const currentCount = counters.get(item.type) || 0;
      counters.set(item.type, currentCount + 1);
      return {
        ...item,
        color: this.typeColors[item.type],
        number: currentCount + 1
      };
    });
  });

  netItems = computed(() => {
    const visible = this.visibleTypes();
    const filtered = this.data()
      .filter(item => item.netTopOffset != null && item.netLeftOffset != null)
      .filter(item => !(item.netTopOffset === 0 && item.netLeftOffset === 0))
      .filter(item => visible.has(item.type));
    
    // Add sequential numbering per type
    const counters = new Map<ShotLocationData['type'], number>();
    return filtered.map(item => {
      const currentCount = counters.get(item.type) || 0;
      counters.set(item.type, currentCount + 1);
      return {
        ...item,
        color: this.typeColors[item.type],
        number: currentCount + 1
      };
    });
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

  private loadFiltersFromStorage(key: string): void {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const filters = JSON.parse(stored) as ShotLocationData['type'][];
        this.visibleTypes.set(new Set(filters));
      } else {
        // By default, show all types
        this.visibleTypes.set(new Set(['Goal', 'Save', 'Scoring Chance', 'Penalty', 'Turnover', 'Blocked', 'Missed', 'PP Goal', 'SH Goal', 'Faceoff']));
      }
    } catch {
      // If there's an error parsing, default to showing all types
      this.visibleTypes.set(new Set(['Goal', 'Save', 'Scoring Chance', 'Penalty', 'Turnover', 'Blocked', 'Missed', 'PP Goal', 'SH Goal', 'Faceoff']));
    }
  }
}
