import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface GamePlayerData {
  id: number;
  first_name: string;
  last_name: string;
  goals: number;
  assists: number;
  shots_on_goal: number;
  scoring_chances: number;
  penalty_minutes: string;
  turnovers: number;
  faceoffs: number;
  points: number;
  number?: number;
}

export interface GameGoalieData {
  id: number;
  first_name: string;
  last_name: string;
  goals_against: number;
  shots_against: number;
  saves: number;
  save_percents: number;
  number?: number;
}

export interface GameRosterResponse {
  home_goalies: GameGoalieData[];
  home_players: GamePlayerData[];
  away_goalies: GameGoalieData[];
  away_players: GamePlayerData[];
}

@Injectable({
  providedIn: 'root'
})
export class GamePlayerService {
  private apiService = inject(ApiService);

  /**
   * Get roster for a specific game
   */
  getGameRoster(gameId: number): Observable<GameRosterResponse> {
    return this.apiService.get<GameRosterResponse>(`/hockey/game-player/game/${gameId}`);
  }
}
