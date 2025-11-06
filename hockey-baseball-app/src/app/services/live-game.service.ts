import { Injectable, inject } from '@angular/core';
import { Observable, of, catchError, map } from 'rxjs';
import { ApiService } from './api.service';

export interface DefensiveZoneExit {
  icing: number;
  skate_out: number;
  so_win: number;
  so_lose: number;
  passes: number;
  id: number;
}

export interface OffensiveZoneEntry {
  pass_in: number;
  dump_win: number;
  dump_lose: number;
  skate_in: number;
  id: number;
}

export interface Shots {
  shots_on_goal: number;
  saves: number;
  missed_net: number;
  scoring_chance: number;
  blocked: number;
  id: number;
}

export interface Turnovers {
  off_zone: number;
  neutral_zone: number;
  def_zone: number;
  id: number;
}

export interface GameEvent {
  game_id: number;
  event_name_id: number;
  time: string;
  period_id: number;
  team_id: number;
  player_id: number;
  player_2_id: number;
  goalie_id: number;
  shot_type_id: number;
  is_scoring_chance: boolean;
  ice_top_offset: number;
  ice_left_offset: number;
  net_top_offset: number;
  net_left_offset: number;
  goal_type: string;
  zone: string;
  note: string;
  is_faceoff_won: boolean;
  time_length: string;
  youtube_link: string;
  id: number;
}

export interface LiveGameData {
  game_period_id: number;
  home_goalie_id: number;
  away_goalie_id: number;
  home_goals: number;
  away_goals: number;
  home_faceoff_win: number;
  away_faceoff_win: number;
  home_defensive_zone_exit: DefensiveZoneExit;
  away_defensive_zone_exit: DefensiveZoneExit;
  home_offensive_zone_entry: OffensiveZoneEntry;
  away_offensive_zone_entry: OffensiveZoneEntry;
  home_shots: Shots;
  away_shots: Shots;
  home_turnovers: Turnovers;
  away_turnovers: Turnovers;
  events: GameEvent[];
}

export interface GameDetails {
  id: number;
  home_team_id: number;
  home_team_goalie_id: number;
  away_team_id: number;
  away_team_goalie_id: number;
  game_type_id: number;
  game_type_name_id: number;
  status: number;
  date: string;
  time: string;
  rink_id: number;
  home_goalies: number[];
  away_goalies: number[];
  home_players: number[];
  away_players: number[];
  game_period_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class LiveGameService {
  private apiService = inject(ApiService);

  /**
   * Get game details for a specific game
   */
  getGameDetails(gameId: number): Observable<GameDetails> {
    return this.apiService.get<GameDetails>(`/hockey/game/${gameId}`).pipe(
      catchError((error) => {
        console.warn('Failed to load game details, using mock data:', error);
        return of(this.getMockGameDetails(gameId));
      })
    );
  }

  /**
   * Get live game data for a specific game
   * Falls back to mock data if API returns no data or fails
   */
  getLiveGameData(gameId: number): Observable<LiveGameData> {
    return this.apiService.get<LiveGameData>(`/hockey/game/${gameId}/live_data`).pipe(
      catchError((error) => {
        console.warn('Failed to load live game data, using mock data:', error);
        return of(this.getMockLiveGameData(gameId));
      })
    );
  }

  /**
   * Returns mock game details
   */
  private getMockGameDetails(gameId: number): GameDetails {
    return {
      id: gameId,
      home_team_id: 22,
      home_team_goalie_id: 205,
      away_team_id: 24,
      away_team_goalie_id: 203,
      game_type_id: 1,
      game_type_name_id: 1,
      status: 2,
      date: '2025-11-05',
      time: '23:55:05.406Z',
      rink_id: 1,
      home_goalies: [205],
      away_goalies: [203],
      home_players: [202],
      away_players: [204],
      game_period_id: 7
    };
  }

  /**
   * Returns mock live game data
   */
  private getMockLiveGameData(gameId: number): LiveGameData {
    return {
      game_period_id: 7,
      home_goalie_id: 205,
      away_goalie_id: 203,
      home_goals: 2,
      away_goals: 1,
      home_faceoff_win: 8,
      away_faceoff_win: 12,
      home_defensive_zone_exit: {
        icing: 3,
        skate_out: 5,
        so_win: 2,
        so_lose: 1,
        passes: 7,
        id: 1
      },
      away_defensive_zone_exit: {
        icing: 2,
        skate_out: 6,
        so_win: 3,
        so_lose: 2,
        passes: 9,
        id: 2
      },
      home_offensive_zone_entry: {
        pass_in: 8,
        dump_win: 4,
        dump_lose: 3,
        skate_in: 6,
        id: 3
      },
      away_offensive_zone_entry: {
        pass_in: 10,
        dump_win: 5,
        dump_lose: 2,
        skate_in: 7,
        id: 4
      },
      home_shots: {
        shots_on_goal: 15,
        saves: 10,
        missed_net: 4,
        scoring_chance: 8,
        blocked: 3,
        id: 5
      },
      away_shots: {
        shots_on_goal: 12,
        saves: 13,
        missed_net: 5,
        scoring_chance: 6,
        blocked: 2,
        id: 6
      },
      home_turnovers: {
        off_zone: 2,
        neutral_zone: 3,
        def_zone: 1,
        id: 7
      },
      away_turnovers: {
        off_zone: 3,
        neutral_zone: 2,
        def_zone: 2,
        id: 8
      },
      events: [
        {
          game_id: gameId,
          event_name_id: 1,
          time: '2025-11-06T00:05:26.078Z',
          period_id: 7,
          team_id: 22,
          player_id: 202,
          player_2_id: 0,
          goalie_id: 203,
          shot_type_id: 1,
          is_scoring_chance: true,
          ice_top_offset: 50,
          ice_left_offset: 25,
          net_top_offset: 10,
          net_left_offset: 5,
          goal_type: 'Even Strength',
          zone: 'Offensive',
          note: 'Top shelf',
          is_faceoff_won: true,
          time_length: 'PT5M',
          youtube_link: '',
          id: 1
        },
        {
          game_id: gameId,
          event_name_id: 4,
          time: '2025-11-06T00:10:15.000Z',
          period_id: 7,
          team_id: 24,
          player_id: 204,
          player_2_id: 0,
          goalie_id: 0,
          shot_type_id: 0,
          is_scoring_chance: false,
          ice_top_offset: 0,
          ice_left_offset: 0,
          net_top_offset: 0,
          net_left_offset: 0,
          goal_type: '',
          zone: 'Defensive',
          note: 'Tripping',
          is_faceoff_won: false,
          time_length: 'PT2M',
          youtube_link: '',
          id: 2
        },
        {
          game_id: gameId,
          event_name_id: 1,
          time: '2025-11-06T00:18:30.000Z',
          period_id: 7,
          team_id: 22,
          player_id: 202,
          player_2_id: 0,
          goalie_id: 203,
          shot_type_id: 2,
          is_scoring_chance: true,
          ice_top_offset: 45,
          ice_left_offset: 30,
          net_top_offset: 8,
          net_left_offset: 12,
          goal_type: 'Power Play',
          zone: 'Offensive',
          note: 'One-timer',
          is_faceoff_won: false,
          time_length: 'PT3M',
          youtube_link: '',
          id: 3
        },
        {
          game_id: gameId,
          event_name_id: 1,
          time: '2025-11-06T00:22:45.000Z',
          period_id: 7,
          team_id: 24,
          player_id: 204,
          player_2_id: 0,
          goalie_id: 205,
          shot_type_id: 3,
          is_scoring_chance: true,
          ice_top_offset: 48,
          ice_left_offset: 28,
          net_top_offset: 6,
          net_left_offset: 8,
          goal_type: 'Even Strength',
          zone: 'Offensive',
          note: 'Breakaway',
          is_faceoff_won: true,
          time_length: 'PT1M',
          youtube_link: '',
          id: 4
        }
      ]
    };
  }
}
