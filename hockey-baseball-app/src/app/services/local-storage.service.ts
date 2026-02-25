import { Injectable } from '@angular/core';

export enum StorageKey {
  LayoutMode = 'layoutMode',
  ShotLocationFilters = 'shotLocationFilters',
  GoalieSprayChartFilters = 'goalieSprayChartFilters',
  PlayerSprayChartFilters = 'playerSprayChartFilters',
  LiveDashboardAwaySprayChart = 'liveDashboardAwaySprayChart',
  LiveDashboardHomeSprayChart = 'liveDashboardHomeSprayChart',
}

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  get(key: StorageKey): string | null {
    return localStorage.getItem(key);
  }

  set(key: StorageKey, value: string): void {
    localStorage.setItem(key, value);
  }

  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  }

  getJson<T>(key: StorageKey): T | null {
    const value = localStorage.getItem(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  setJson(key: StorageKey, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
