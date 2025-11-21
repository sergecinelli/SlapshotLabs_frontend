import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { GameSprayChartFilter, SprayChartEvent } from '../shared/interfaces/spray-chart.interface';

export interface GameEventRequest {
  game_id: number;
  event_name_id: number;
  time: string;
  period_id: number;
  team_id: number;
  player_id?: number;
  player_2_id?: number;
  goalie_id?: number;
  shot_type_id?: number;
  is_scoring_chance?: boolean;
  ice_top_offset?: number;
  ice_left_offset?: number;
  net_top_offset?: number;
  net_left_offset?: number;
  goal_type?: string;
  zone?: string;
  note?: string;
  time_length?: string;
  youtube_link?: string;
}

export interface TurnoverEventRequest {
  game_id: number;
  event_name_id: number;
  team_id: number;
  player_id: number;
  period_id: number;
  time: string;
  youtube_link?: string;
  ice_top_offset?: number;
  ice_left_offset?: number;
  zone?: string;
}

export interface FaceoffEventRequest {
  game_id: number;
  event_name_id: number;
  team_id: number;
  player_id: number;
  player_2_id: number;
  period_id: number;
  time: string;
  youtube_link?: string;
  ice_top_offset?: number;
  ice_left_offset?: number;
  zone?: string;
}

export interface GoalieChangeEventRequest {
  game_id: number;
  event_name_id: number;
  team_id: number;
  goalie_id?: number | undefined;
  period_id: number;
  time: string;
  note?: string;
}

export interface PenaltyEventRequest {
  game_id: number;
  event_name_id: number;
  team_id: number;
  player_id: number;
  period_id: number;
  time: string;
  time_length: string;
  youtube_link?: string;
  ice_top_offset?: number;
  ice_left_offset?: number;
  zone?: string;
}

export interface ShotEventRequest {
  game_id: number;
  event_name_id: number;
  team_id: number;
  player_id: number;
  player_2_id?: number; // Assist player (for goals only)
  shot_type_id: number;
  goalie_id?: number | undefined;
  period_id: number;
  time: string;
  youtube_link?: string;
  is_scoring_chance?: boolean;
  note?: string; // Scoring chance note
  ice_top_offset?: number;
  ice_left_offset?: number;
  net_top_offset?: number;
  net_left_offset?: number;
  goal_type?: string; // Goal type: "Short Handed", "Even Strength", "Power Play"
}

@Injectable({
  providedIn: 'root',
})
export class GameEventService {
  private apiService = inject(ApiService);

  /**
   * Create a new game event
   */
  createGameEvent(eventData: GameEventRequest): Observable<{ id: number; success: boolean }> {
    return this.apiService
      .post<{ id: number; success: boolean }>('/hockey/game-event', eventData)
      .pipe(
        catchError((error) => {
          console.error('Failed to create game event:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update an existing game event
   */
  updateGameEvent(
    eventId: number,
    eventData: Partial<GameEventRequest>
  ): Observable<{ success: boolean }> {
    return this.apiService
      .patch<{ success: boolean }>(`/hockey/game-event/${eventId}`, eventData)
      .pipe(
        catchError((error) => {
          console.error('Failed to update game event:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a game event
   */
  deleteGameEvent(eventId: number): Observable<void> {
    return this.apiService.delete<void>(`/hockey/game-event/${eventId}`).pipe(
      catchError((error) => {
        console.error('Failed to delete game event:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a turnover event with only required fields
   */
  createTurnoverEvent(
    turnoverData: TurnoverEventRequest
  ): Observable<{ id: number; success: boolean }> {
    const eventData: GameEventRequest = {
      game_id: turnoverData.game_id,
      event_name_id: turnoverData.event_name_id,
      team_id: turnoverData.team_id,
      player_id: turnoverData.player_id,
      period_id: turnoverData.period_id,
      time: turnoverData.time,
      youtube_link: turnoverData.youtube_link,
      ice_top_offset: turnoverData.ice_top_offset,
      ice_left_offset: turnoverData.ice_left_offset,
      zone: turnoverData.zone,
    };

    return this.createGameEvent(eventData);
  }

  /**
   * Create a faceoff event with required fields
   */
  createFaceoffEvent(
    faceoffData: FaceoffEventRequest
  ): Observable<{ id: number; success: boolean }> {
    const eventData: GameEventRequest = {
      game_id: faceoffData.game_id,
      event_name_id: faceoffData.event_name_id,
      team_id: faceoffData.team_id,
      player_id: faceoffData.player_id,
      player_2_id: faceoffData.player_2_id,
      period_id: faceoffData.period_id,
      time: faceoffData.time,
      youtube_link: faceoffData.youtube_link,
      ice_top_offset: faceoffData.ice_top_offset,
      ice_left_offset: faceoffData.ice_left_offset,
      zone: faceoffData.zone,
    };

    return this.createGameEvent(eventData);
  }

  /**
   * Create a goalie change event with required fields
   */
  createGoalieChangeEvent(
    goalieChangeData: GoalieChangeEventRequest
  ): Observable<{ id: number; success: boolean }> {
    const eventData: GameEventRequest = {
      game_id: goalieChangeData.game_id,
      event_name_id: goalieChangeData.event_name_id,
      team_id: goalieChangeData.team_id,
      goalie_id: goalieChangeData.goalie_id,
      period_id: goalieChangeData.period_id,
      time: goalieChangeData.time,
      note: goalieChangeData.note,
    };

    return this.createGameEvent(eventData);
  }

  /**
   * Create a penalty event with required fields
   */
  createPenaltyEvent(
    penaltyData: PenaltyEventRequest
  ): Observable<{ id: number; success: boolean }> {
    const eventData: GameEventRequest = {
      game_id: penaltyData.game_id,
      event_name_id: penaltyData.event_name_id,
      team_id: penaltyData.team_id,
      player_id: penaltyData.player_id,
      period_id: penaltyData.period_id,
      time: penaltyData.time,
      time_length: penaltyData.time_length,
      youtube_link: penaltyData.youtube_link,
      ice_top_offset: penaltyData.ice_top_offset,
      ice_left_offset: penaltyData.ice_left_offset,
      zone: penaltyData.zone,
    };

    return this.createGameEvent(eventData);
  }

  /**
   * Create a shot event with required fields
   */
  createShotEvent(shotData: ShotEventRequest): Observable<{ id: number; success: boolean }> {
    const eventData: GameEventRequest = {
      game_id: shotData.game_id,
      event_name_id: shotData.event_name_id,
      team_id: shotData.team_id,
      player_id: shotData.player_id,
      player_2_id: shotData.player_2_id,
      shot_type_id: shotData.shot_type_id,
      goalie_id: shotData.goalie_id,
      period_id: shotData.period_id,
      time: shotData.time,
      youtube_link: shotData.youtube_link,
      is_scoring_chance: shotData.is_scoring_chance,
      note: shotData.note,
      ice_top_offset: shotData.ice_top_offset,
      ice_left_offset: shotData.ice_left_offset,
      net_top_offset: shotData.net_top_offset,
      net_left_offset: shotData.net_left_offset,
      goal_type: shotData.goal_type,
    };

    return this.createGameEvent(eventData);
  }

  /**
   * Get spray chart data for a specific game
   */
  getGameSprayChart(
    gameId: number,
    filter: GameSprayChartFilter = {}
  ): Observable<SprayChartEvent[]> {
    return this.apiService
      .post<SprayChartEvent[]>(`/hockey/game/${gameId}/spray-chart`, filter)
      .pipe(
        catchError((error) => {
          console.error(`Failed to fetch spray chart for game ${gameId}:`, error);
          return throwError(() => error);
        })
      );
  }
}
