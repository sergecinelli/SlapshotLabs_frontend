// API Schema interfaces
export interface TeamApiOut {
  id: number;
  name: string;
  age_group: string;
  level_id: number;
  division_id: number;
  city: string;
  games_played: number;
  goals_for: number;
  goals_against: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  abbreviation?: string;
}

export interface TeamApiIn {
  name: string;
  age_group: string;
  level_id: number;
  division_id: number;
  city: string;
  abbreviation?: string;
}

// Frontend interface
export interface Team {
  id: string;
  name: string;
  group: string;
  level: string;
  levelId?: number; // Store level ID for form selection
  division: string;
  divisionId?: number; // Store division ID for form selection
  city: string;
  logo: string;
  gamesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
  abbreviation?: string;
  createdAt?: Date; // Creation date for sorting
  [key: string]: unknown; // Index signature for compatibility with Record<string, unknown>
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

// API response interface for team-season/list endpoint
export interface TeamSeasonOut {
  id: number;
  team_id: number;
  season_id: number;
  games_played: number;
  goals_against: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
}

// Frontend interface for team season statistics
export interface TeamSeasonStat {
  season: string;
  seasonId: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  points: number;
}