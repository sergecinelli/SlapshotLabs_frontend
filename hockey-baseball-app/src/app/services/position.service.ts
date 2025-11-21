import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Position {
  id: number;
  name: string;
}

export interface PositionOption {
  value: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class PositionService {
  private apiService = inject(ApiService);

  getPositions(): Observable<PositionOption[]> {
    return this.apiService.get<Position[]>('/hockey/player-position/list').pipe(
      map((positions) =>
        positions.map((position) => ({
          value: position.name,
          label: position.name,
        }))
      ),
      catchError((error) => {
        console.error('Failed to fetch positions:', error);
        // Fallback to default positions if API fails
        return throwError(() => error);
      })
    );
  }
}
