// API Schema interfaces
export interface TeamApiOut {
  id: number;
  name: string;
  level_id: number;  // Changed from team_level_id
  division_id: number;
  age_group: string;
  city: string;
}

export interface TeamApiIn {
  name: string;
  level_id: number;
  division_id: number;
  age_group: string;
  city: string;
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
  createdAt?: Date;  // Creation date for sorting
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