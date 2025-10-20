// API Schema interfaces
export interface TeamApiOut {
  id: number;
  name: string;
  age_group: string;
  level_id: number;
  division_id: number;
  city: string;
}

export interface TeamApiIn {
  name: string;
  age_group: string;
  level_id: number;
  division_id: number;
  city: string;
}

// Frontend interface
export interface Team {
  id: string;
  name: string;
  group: string;
  level: string;
  division: string;
  city: string;
  logo: string;
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