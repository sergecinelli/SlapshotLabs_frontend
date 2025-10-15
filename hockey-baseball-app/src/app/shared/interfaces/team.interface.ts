// API Schema interfaces
export interface TeamApiOut {
  id: number;
  name: string;
  logo: string;
  team_level_id: number;
  division_id: number;
  wins: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
  games_played: number;
}

export interface TeamApiIn {
  name: string;
  logo: string;
  team_level_id: number;
  division_id: number;
  wins: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  points: number;
  games_played: number;
}

// Frontend interface
export interface Team {
  id: string;
  name: string;
  logo: string;
  level: string;
  division: string;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  gamesPlayed: number;
  [key: string]: unknown;  // Index signature for compatibility with Record<string, unknown>
}

export interface TeamTableData {
  teams: Team[];
  total: number;
}

export interface TeamSeasonStats {
  season: string;
  logo: string;
  team: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  goalDifferential: number;
}