export interface SprayChartFilter {
  season_id?: number;
  game_id?: number;
  shot_type_id?: number;
}

export interface GameSprayChartFilter {
  event_name?: string;
}

export interface SprayChartEvent {
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
}
