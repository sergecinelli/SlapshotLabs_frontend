import { Component, input, computed, ChangeDetectionStrategy, signal, effect, inject, viewChild, ElementRef } from '@angular/core';
import {  } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { environment } from '../../../../environments/environment';
import { LocalStorageService, StorageKey } from '../../../services/local-storage.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs';

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
  youtubeLink?: string;
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
  imports: [MatIconModule, ButtonSmallComponent],
  templateUrl: './shot-location-display.component.html',
  styleUrl: './shot-location-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'shot-location-display',
  },
})
export class ShotLocationDisplayComponent {
  private storage = inject(LocalStorageService);

  data = input.required<ShotLocationData[]>();
  storageKey = input<StorageKey>(StorageKey.ShotLocationFilters);
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
  selectedIndices = signal<Set<number>>(new Set());
  linesData = signal<{ x1: number; y1: number; x2: number; y2: number; color: string; viewBox: string }[]>([]);
  hoveredLine = signal<{ x1: number; y1: number; x2: number; y2: number; color: string; viewBox: string } | null>(null);
  popoverItem = signal<(ShotLocationData & { color: string }) | null>(null);
  popoverPosition = signal<{ top: number; left: number } | null>(null);
  popoverAbove = signal(false);

  private locationImagesRef = viewChild<ElementRef<HTMLElement>>('locationImages');
  private rinkWrapperRef = viewChild<ElementRef<HTMLElement>>('rinkWrapper');
  private netWrapperRef = viewChild<ElementRef<HTMLElement>>('netWrapper');

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
        this.storage.setJson(key, filters);
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

    // Recalculate line position on window resize
    fromEvent(window, 'resize')
      .pipe(debounceTime(150), takeUntilDestroyed())
      .subscribe(() => this.recalculateLineCoords());

    // Close popover when clicking outside
    fromEvent<MouseEvent>(document, 'click')
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (this.popoverItem()) {
          const target = event.target as HTMLElement;
          if (!target.closest('.marker-popover') && !target.closest('.location-marker')) {
            this.closePopover();
          }
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
    this.selectedIndices.set(new Set());
    this.linesData.set([]);
  }

  selectMarker(item: ShotLocationData, event: MouseEvent): void {
    // Handle popover
    if (this.popoverItem()?.index === item.index) {
      this.closePopover();
    } else {
      this.showPopover(item, event);
    }

    // Handle line selection (only for markers with both positions)
    const hasRinkPos = !(item.iceTopOffset === 0 && item.iceLeftOffset === 0);
    const hasNetPos =
      item.netTopOffset != null &&
      item.netLeftOffset != null &&
      !(item.netTopOffset === 0 && item.netLeftOffset === 0);

    if (hasRinkPos && hasNetPos) {
      const current = new Set(this.selectedIndices());
      if (current.has(item.index)) {
        current.delete(item.index);
      } else {
        current.add(item.index);
      }
      this.selectedIndices.set(current);
      requestAnimationFrame(() => this.recalculateAllLines());
    }
  }

  onMarkerHover(item: ShotLocationData): void {
    // Don't show hover line if already selected
    if (this.selectedIndices().has(item.index)) {
      this.hoveredLine.set(null);
      return;
    }

    const hasRinkPos = !(item.iceTopOffset === 0 && item.iceLeftOffset === 0);
    const hasNetPos =
      item.netTopOffset != null &&
      item.netLeftOffset != null &&
      !(item.netTopOffset === 0 && item.netLeftOffset === 0);

    if (!hasRinkPos || !hasNetPos) {
      this.hoveredLine.set(null);
      return;
    }

    const container = this.locationImagesRef()?.nativeElement;
    const rinkWrapper = this.rinkWrapperRef()?.nativeElement;
    const netWrapper = this.netWrapperRef()?.nativeElement;
    if (!container || !rinkWrapper || !netWrapper) return;

    const containerRect = container.getBoundingClientRect();
    const rinkImg = rinkWrapper.querySelector('.location-image') as HTMLElement;
    const netImg = netWrapper.querySelector('.location-image') as HTMLElement;
    if (!rinkImg || !netImg) return;

    const rinkRect = rinkImg.getBoundingClientRect();
    const netRect = netImg.getBoundingClientRect();

    this.hoveredLine.set({
      x1: rinkRect.left - containerRect.left + (item.iceLeftOffset / 100) * rinkRect.width,
      y1: rinkRect.top - containerRect.top + (item.iceTopOffset / 100) * rinkRect.height,
      x2: netRect.left - containerRect.left + (item.netLeftOffset! / 100) * netRect.width,
      y2: netRect.top - containerRect.top + (item.netTopOffset! / 100) * netRect.height,
      color: this.typeColors[item.type],
      viewBox: `0 0 ${containerRect.width} ${containerRect.height}`,
    });
  }

  onMarkerLeave(): void {
    this.hoveredLine.set(null);
  }

  private showPopover(item: ShotLocationData, event: MouseEvent): void {
    const marker = event.currentTarget as HTMLElement;
    const markerRect = marker.getBoundingClientRect();

    // Check if there's enough space below for the popover (~200px estimate)
    const spaceBelow = window.innerHeight - markerRect.bottom;
    const showAbove = spaceBelow < 200;

    this.popoverAbove.set(showAbove);
    this.popoverPosition.set({
      top: showAbove
        ? markerRect.top - 8
        : markerRect.bottom + 8,
      left: markerRect.left + markerRect.width / 2,
    });
    this.popoverItem.set({ ...item, color: this.typeColors[item.type] });
  }

  closePopover(): void {
    this.popoverItem.set(null);
    this.popoverPosition.set(null);
  }

  clearAllLines(): void {
    this.selectedIndices.set(new Set());
    this.linesData.set([]);
    this.closePopover();
  }

  openVideo(youtubeLink?: string): void {
    if (!youtubeLink) return;
    window.open(youtubeLink, '_blank', 'noopener');
  }

  private recalculateLineCoords(): void {
    this.recalculateAllLines();
  }

  private recalculateAllLines(): void {
    const indices = this.selectedIndices();
    if (indices.size === 0) {
      this.linesData.set([]);
      return;
    }

    const container = this.locationImagesRef()?.nativeElement;
    const rinkWrapper = this.rinkWrapperRef()?.nativeElement;
    const netWrapper = this.netWrapperRef()?.nativeElement;

    if (!container || !rinkWrapper || !netWrapper) {
      this.linesData.set([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rinkImg = rinkWrapper.querySelector('.location-image') as HTMLElement;
    const netImg = netWrapper.querySelector('.location-image') as HTMLElement;

    if (!rinkImg || !netImg) {
      this.linesData.set([]);
      return;
    }

    const rinkRect = rinkImg.getBoundingClientRect();
    const netRect = netImg.getBoundingClientRect();
    const viewBox = `0 0 ${containerRect.width} ${containerRect.height}`;

    const lines: { x1: number; y1: number; x2: number; y2: number; color: string; viewBox: string }[] = [];

    for (const index of indices) {
      const item = this.data().find((d) => d.index === index);
      if (!item || item.netTopOffset == null || item.netLeftOffset == null) continue;

      const x1 = rinkRect.left - containerRect.left + (item.iceLeftOffset / 100) * rinkRect.width;
      const y1 = rinkRect.top - containerRect.top + (item.iceTopOffset / 100) * rinkRect.height;
      const x2 = netRect.left - containerRect.left + (item.netLeftOffset / 100) * netRect.width;
      const y2 = netRect.top - containerRect.top + (item.netTopOffset / 100) * netRect.height;

      lines.push({ x1, y1, x2, y2, color: this.typeColors[item.type], viewBox });
    }

    this.linesData.set(lines);
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

  private loadFiltersFromStorage(key: StorageKey): void {
    try {
      const filters = this.storage.getJson<ShotLocationData['type'][]>(key);
      if (filters) {
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
