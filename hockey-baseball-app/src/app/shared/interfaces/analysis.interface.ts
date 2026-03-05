export type AnalysisType = 'player' | 'goalie' | 'team' | 'game';

export interface AnalyticsTeamOut {
  id: number;
  name: string;
  abbreviation: string | null;
  city: string;
}

export interface AnalyticsPlayerOut {
  id: number;
  first_name: string;
  last_name: string;
  number: number;
}

export interface AnalyticsGameOut {
  id: number;
  home_team_id: number;
  home_team_name: string;
  home_goals: number;
  away_team_id: number;
  away_team_name: string;
  away_goals: number;
  date: string;
  time: string;
}

export interface AnalyticsApiOut {
  id: number;
  author: string;
  title: string;
  analysis: string;
  date: string;
  time: string;
  team: AnalyticsTeamOut | null;
  player: AnalyticsPlayerOut | null;
  game: AnalyticsGameOut | null;
}

export interface AnalyticsApiIn {
  author: string;
  title: string;
  analysis: string;
  team_id?: number | null;
  player_id?: number | null;
  game_id?: number | null;
}

export interface Analysis extends Record<string, unknown> {
  id: string;
  type: AnalysisType;
  entityId: number;
  entityName: string;
  author: string;
  title: string;
  analysis: string;
  date: string;
  time: string;
  city?: string;
  number?: number;
  score?: string;
  gameDate?: string;
}

export interface AnalysisTableData {
  analytics: Analysis[];
  total: number;
}
