import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface GameEventName {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class GameEventNameService {
  private apiService = inject(ApiService);

  /**
   * Get list of all game event names
   */
  getGameEventNames(): Observable<GameEventName[]> {
    return this.apiService.get<GameEventName[]>('/hockey/game-event-name/list');
  }
}
