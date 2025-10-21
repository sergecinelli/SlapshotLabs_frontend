import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Arena, Rink } from '../shared/interfaces/arena.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ArenaService {
  private apiService = inject(ApiService);

  /**
   * Fetch all arenas from the API
   */
  getArenas(): Observable<Arena[]> {
    return this.apiService.get<Arena[]>('/hockey/arena/list').pipe(
      catchError(error => {
        console.error('Failed to fetch arenas:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch rinks for a specific arena
   */
  getRinksByArena(arenaId: number): Observable<Rink[]> {
    return this.apiService.get<Rink[]>(`/hockey/arena/${arenaId}/rinks`).pipe(
      catchError(error => {
        console.error('Failed to fetch rinks:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch all rinks
   */
  getAllRinks(): Observable<Rink[]> {
    return this.apiService.get<Rink[]>('/hockey/rink/list').pipe(
      catchError(error => {
        console.error('Failed to fetch all rinks:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Transform arenas to dropdown options
   */
  transformArenasToOptions(arenas: Arena[]): { value: number; label: string }[] {
    return arenas.map(arena => ({
      value: arena.id,
      label: arena.name
    }));
  }

  /**
   * Transform rinks to dropdown options
   */
  transformRinksToOptions(rinks: Rink[]): { value: number; label: string }[] {
    return rinks.map(rink => ({
      value: rink.id,
      label: rink.name
    }));
  }
}