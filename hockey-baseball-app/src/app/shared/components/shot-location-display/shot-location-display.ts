import { Component, input, computed, ChangeDetectionStrategy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ShotLocationData {
  iceTopOffset: number;
  iceLeftOffset: number;
  netTopOffset?: number | null;
  netLeftOffset?: number | null;
  type: 'Goal' | 'Save' | 'Scoring Chance' | 'Penalty' | 'Turnover';
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
  private readonly STORAGE_KEY = 'shotLocationFilters';
  
  data = input.required<ShotLocationData[]>();
  visibleTypes = signal<Set<ShotLocationData['type']>>(new Set());

  constructor() {
    // Load filters from local storage on initialization
    this.loadFiltersFromStorage();
    
    // Save filters to local storage whenever they change
    effect(() => {
      const filters = Array.from(this.visibleTypes());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filters));
    });
  }

  private readonly typeColors: Record<ShotLocationData['type'], string> = {
    'Goal': '#22c55e',
    'Save': '#3b82f6',
    'Scoring Chance': '#f59e0b',
    'Penalty': '#ef4444',
    'Turnover': '#8b5cf6'
  };

  private readonly typePlurals: Record<ShotLocationData['type'], string> = {
    'Goal': 'Goals',
    'Save': 'Saves',
    'Scoring Chance': 'Scoring Chances',
    'Penalty': 'Penalties',
    'Turnover': 'Turnovers'
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
    return this.data()
      .filter(item => visible.has(item.type))
      .map(item => ({
        ...item,
        color: this.typeColors[item.type]
      }));
  });

  netItems = computed(() => {
    const visible = this.visibleTypes();
    return this.data()
      .filter(item => item.netTopOffset != null && item.netLeftOffset != null)
      .filter(item => visible.has(item.type))
      .map(item => ({
        ...item,
        color: this.typeColors[item.type]
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

  private loadFiltersFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const filters = JSON.parse(stored) as ShotLocationData['type'][];
        this.visibleTypes.set(new Set(filters));
      } else {
        // By default, show all types
        this.visibleTypes.set(new Set(['Goal', 'Save', 'Scoring Chance', 'Penalty', 'Turnover']));
      }
    } catch (error) {
      // If there's an error parsing, default to showing all types
      this.visibleTypes.set(new Set(['Goal', 'Save', 'Scoring Chance', 'Penalty', 'Turnover']));
    }
  }
}
