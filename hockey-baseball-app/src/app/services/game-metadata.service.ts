import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface GameTypeResponse {
  id: number;
  name: string;
  description?: string;
}

export interface GamePeriodResponse {
  id: number;
  name: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameMetadataService {
  private apiService = inject(ApiService);

  /**
   * Fetch all game types from the API
   */
  getGameTypes(): Observable<GameTypeResponse[]> {
    return this.apiService.get<GameTypeResponse[]>('/hockey/game-type/list').pipe(
      catchError(error => {
        console.error('Failed to fetch game types:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch all game periods from the API
   */
  getGamePeriods(): Observable<GamePeriodResponse[]> {
    return this.apiService.get<GamePeriodResponse[]>('/hockey/game-period/list').pipe(
      catchError(error => {
        console.error('Failed to fetch game periods:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Transform game types to dropdown options
   */
  transformGameTypesToOptions(gameTypes: GameTypeResponse[]): { value: number; label: string }[] {
    return gameTypes.map(type => ({
      value: type.id,
      label: type.name
    }));
  }

  /**
   * Transform game periods to dropdown options
   */
  transformGamePeriodsToOptions(gamePeriods: GamePeriodResponse[]): { value: number; label: string }[] {
    return gamePeriods.map(period => ({
      value: period.id,
      label: period.name
    }));
  }
}
