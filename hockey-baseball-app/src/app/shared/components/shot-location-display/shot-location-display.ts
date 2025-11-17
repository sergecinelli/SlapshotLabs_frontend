import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
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
  data = input.required<ShotLocationData[]>();

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
      ...stats
    }));
  });

  rinkItems = computed(() => {
    return this.data().map(item => ({
      ...item,
      color: this.typeColors[item.type]
    }));
  });

  netItems = computed(() => {
    return this.data()
      .filter(item => item.netTopOffset != null && item.netLeftOffset != null)
      .map(item => ({
        ...item,
        color: this.typeColors[item.type]
      }));
  });
}
