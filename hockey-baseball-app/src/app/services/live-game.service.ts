import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
  time_length: string;
  youtube_link: string;
  id: number;
  date?: string | undefined;
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

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface GameExtra {
  id: number;
  home_team_id: number;
  home_start_goalie_id: number;
  home_goals: number;
  away_team_id: number;
  away_start_goalie_id: number;
  away_goals: number;
  game_type_id: number;
  game_type: string;
  game_type_name: string;
  status: number;
  date: string;
  time: string;
  season_id: number;
  arena_id: number;
  rink_id: number;
  game_period_id: number;
  home_team_game_type_record: TeamRecord;
  away_team_game_type_record: TeamRecord;
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
  providedIn: 'root',
})
export class LiveGameService {
  private apiService = inject(ApiService);

  /**
   * Get game extra data (static data that doesn't change)
   */
  getGameExtra(gameId: number): Observable<GameExtra> {
    return this.apiService.get<GameExtra>(`/hockey/game/${gameId}/extra`);
  }

  /**
   * Get game details for a specific game
   * @deprecated Use getGameExtra instead
   */
  getGameDetails(gameId: number): Observable<GameDetails> {
    return this.apiService.get<GameDetails>(`/hockey/game/${gameId}`);
  }

  /**
   * Get live game data for a specific game (should be polled)
   */
  getLiveGameData(gameId: number): Observable<LiveGameData> {
    return this.apiService.get<LiveGameData>(`/hockey/game/${gameId}/live-data`);
  }

  /**
   * Update a defensive zone exit row by ID with partial fields
   */
  updateDefensiveZoneExit(
    defensiveZoneExitId: number,
    patch: Partial<Pick<DefensiveZoneExit, 'icing' | 'skate_out' | 'so_win' | 'so_lose' | 'passes'>>
  ): Observable<DefensiveZoneExit> {
    return this.apiService.patch<DefensiveZoneExit>(
      `/hockey/game/defensive-zone-exit/${defensiveZoneExitId}`,
      patch
    );
  }

  /**
   * Update an offensive zone entry row by ID with partial fields
   */
  updateOffensiveZoneEntry(
    offensiveZoneEntryId: number,
    patch: Partial<Pick<OffensiveZoneEntry, 'pass_in' | 'dump_win' | 'dump_lose' | 'skate_in'>>
  ): Observable<OffensiveZoneEntry> {
    return this.apiService.patch<OffensiveZoneEntry>(
      `/hockey/game/offensive-zone-entry/${offensiveZoneEntryId}`,
      patch
    );
  }
}
