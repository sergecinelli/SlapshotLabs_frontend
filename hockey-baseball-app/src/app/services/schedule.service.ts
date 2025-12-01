import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private apiService = inject(ApiService);

  getDashboardGames(teamId?: number, limit = 5): Observable<{
    upcoming_games: {
      id: number;
      home_team_id: number;
      home_goals: number;
      home_start_goalie_id: number | null;
      away_team_id: number;
      away_goals: number;
      away_start_goalie_id: number | null;
      game_type_id: number;
      game_type_name: string | null;
      tournament_name?: string;
      date: string;
      time: string;
      rink_id: number | null;
      status: number;
      season_id?: number | null;
      arena_id?: number | null;
    }[];
    previous_games: {
      id: number;
      home_team_id: number;
      home_goals: number;
      home_start_goalie_id: number | null;
      away_team_id: number;
      away_goals: number;
      away_start_goalie_id: number | null;
      game_type_id: number;
      game_type_name: string | null;
      tournament_name?: string;
      date: string;
      time: string;
      rink_id: number | null;
      status: number;
      season_id?: number | null;
      arena_id?: number | null;
    }[];
  }> {
    const params: Record<string, string> = {};
    if (limit) {
      params['limit'] = limit.toString();
    }
    if (teamId) {
      params['team_id'] = teamId.toString();
    }
    const queryString = new URLSearchParams(params).toString();
    const url = `/hockey/game/list/dashboard${queryString ? `?${queryString}` : ''}`;
    
    return this.apiService.get<{
      upcoming_games: {
        id: number;
        home_team_id: number;
        home_goals: number;
        home_start_goalie_id: number | null;
        away_team_id: number;
        away_goals: number;
        away_start_goalie_id: number | null;
        game_type_id: number;
        game_type_name: string | null;
        tournament_name?: string;
        date: string;
        time: string;
        rink_id: number | null;
        status: number;
        season_id?: number | null;
        arena_id?: number | null;
      }[];
      previous_games: {
        id: number;
        home_team_id: number;
        home_goals: number;
        home_start_goalie_id: number | null;
        away_team_id: number;
        away_goals: number;
        away_start_goalie_id: number | null;
        game_type_id: number;
        game_type_name: string | null;
        tournament_name?: string;
        date: string;
        time: string;
        rink_id: number | null;
        status: number;
        season_id?: number | null;
        arena_id?: number | null;
      }[];
    }>(url);
  }

  getGameList(): Observable<
    {
      id: number;
      home_team_id: number;
      home_goals: number;
      home_start_goalie_id: number;
      away_team_id: number;
      away_goals: number;
      away_start_goalie_id: number;
      game_type_id: number;
      game_type_name?: string;
      tournament_name?: string;
      date: string;
      time: string;
      rink_id: number;
      status: number;
    }[]
  > {
    return this.apiService.get<
      {
        id: number;
        home_team_id: number;
        home_goals: number;
        home_start_goalie_id: number;
        away_team_id: number;
        away_goals: number;
        away_start_goalie_id: number;
        game_type_id: number;
        game_type_name?: string;
        tournament_name?: string;
        date: string;
        time: string;
        rink_id: number;
        status: number;
      }[]
    >('/hockey/game/list');
  }

  createGame(gameData: Record<string, unknown>): Observable<{ id: number; success: boolean }> {
    return this.apiService.post<{ id: number; success: boolean }>('/hockey/game', gameData);
  }

  updateGame(gameId: number, gameData: Record<string, unknown>): Observable<{ success: boolean }> {
    return this.apiService.patch<{ success: boolean }>(`/hockey/game/${gameId}`, gameData);
  }

  deleteGame(gameId: number): Observable<{ success: boolean }> {
    return this.apiService.delete<{ success: boolean }>(`/hockey/game/${gameId}`);
  }
}
