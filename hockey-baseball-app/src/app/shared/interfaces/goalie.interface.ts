export interface GoalieRink {
  facilityName: string;
  rinkName: string;
  city: string;
  address: string;
}

// API Schema interfaces - matching backend
export interface GoalieApiInData {
  team_id: number;
  height: number; // Height in inches
  weight: number; // Weight in lbs
  shoots: string; // "R" for Right Shot, "L" for Left Shot
  number: number; // Jersey number
  first_name: string;
  last_name: string;
  birth_year: string; // Date format: YYYY-MM-DD
  player_bio?: string;
  birthplace_country?: string;
  address_country?: string;
  address_region?: string;
  address_city?: string;
  address_street?: string;
  address_postal_code?: string;
  analysis?: string;
}

// POST request format with photo and data wrapper
export interface GoalieApiIn {
  photo?: string;
  data: GoalieApiInData;
}

export interface GoalieApiOutData {
  id: number;
  team_id: number;
  height: number; // Height in inches
  weight: number; // Weight in lbs
  shoots: string; // "R" for Right Shot, "L" for Left Shot
  number: number; // Jersey number
  first_name: string;
  last_name: string;
  birth_year: string; // Date format
  player_bio?: string;
  birthplace_country?: string;
  address_country?: string;
  address_region?: string;
  address_city?: string;
  address_street?: string;
  address_postal_code?: string;
  wins: number;
  losses: number;
  penalty_minutes?: number;
  analysis?: string;
  shots_on_goal?: number;
  saves?: number;
  goals_against?: number;
  games_played?: number;
  goals?: number;
  assists?: number;
  save_percents?: number;
  short_handed_goals_against?: number;
  power_play_goals_against?: number;
  shots_on_goal_per_game?: number;
  points?: number;
}

// GET response format with photo and data wrapper
export interface GoalieApiOut {
  photo: string;
  data: GoalieApiOutData;
}

// PATCH request format (partial update)
export interface GoalieApiPatch {
  photo?: string;
  data?: Partial<GoalieApiInData>;
}

// Frontend interface - keeping existing structure for compatibility
export interface Goalie {
  id: string;
  teamId?: number; // Team ID from API
  team: string;
  level: string;
  position: string;
  height: string; // e.g., "5'6""
  weight: number; // in lbs
  shoots: 'Right Shot' | 'Left Shot';
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  birthYear: number;
  birthplace?: string; // Birthplace field
  address?: string; // Single address field
  playerBiography?: string; // Player biography text
  country?: string; // Optional country field
  shotsOnGoal: number;
  saves: number;
  goalsAgainst: number;
  shotsOnGoalPerGame: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  goals: number;
  assists: number;
  points: number;
  ppga: number; // Power Play Goals Against
  shga: number; // Short Handed Goals Against
  savesAboveAvg: number;
  createdAt?: Date; // Creation date for sorting
  [key: string]: unknown; // Index signature for compatibility with Record<string, unknown>
}

export interface GoalieTableData {
  goalies: Goalie[];
  total: number;
}

// Season Stats interface
export interface GoalieSeasonStats {
  season: string;
  logo: string;
  team: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePercentage: number;
}

// Recent Game Stats interface
export interface GoalieRecentGameStats {
  season: string;
  date: string;
  vs: string;
  teamLogo: string;
  team: string;
  score: string;
  goalsAgainst: number;
  shotsAgainst: number;
  saves: number;
  savePercentage: number;
}
