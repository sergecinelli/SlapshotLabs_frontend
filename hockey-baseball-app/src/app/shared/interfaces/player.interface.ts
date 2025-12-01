export interface PlayerRink {
  facilityName: string;
  rinkName: string;
  city: string;
  address: string;
}

// API Schema interfaces - matching backend
export interface PlayerApiInData {
  team_id: number;
  position_id: number;
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
  penalties_drawn?: number;
  penalty_minutes?: number;
  faceoffs?: number;
  faceoffs_won?: number;
  turnovers?: number;
  analysis?: string;
}

// POST request format with photo and data wrapper
export interface PlayerApiIn {
  photo: string;
  data: PlayerApiInData;
}

export interface PlayerApiOutData {
  id: number;
  team_id: number;
  position_id: number;
  height: number; // Height in inches
  weight: number; // Weight in lbs
  shoots: string; // "R" for Right Shot, "L" for Left Shot
  number: number; // Jersey number (named "number" in API)
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
  penalties_drawn?: number;
  penalty_minutes?: number;
  faceoffs?: number;
  faceoffs_won?: number;
  turnovers?: number;
  analysis?: string;
  goals?: number;
  assists?: number;
  points?: number;
  scoring_chances?: number;
  blocked_shots?: number;
  penalties_taken?: number;
  games_played?: number;
  shots_on_goal?: number;
  shots_on_goal_per_game?: number;
  five_on_five_diff?: number;
  overall_diff?: number;
  penalty_kill_diff?: number;
  power_play_goals_diff?: number;
  faceoff_win_percents?: number;
  short_handed_goals?: number;
  power_play_goals?: number;
}

// GET response format with photo and data wrapper
export interface PlayerApiOut {
  photo: string;
  data: PlayerApiOutData;
}

// PATCH request format (partial update)
export interface PlayerApiPatch {
  photo?: string;
  data?: Partial<PlayerApiInData>;
}

// Frontend interface - keeping structure similar to goalies
export interface Player {
  id: string;
  teamId?: number; // Team ID from API
  team: string;
  position: 'Left Wing' | 'Center' | 'Right Wing' | 'Left Defense' | 'Right Defense' | 'Goalie';
  height: string; // e.g., "5'6""
  weight: number; // in lbs
  shoots: 'Right Shot' | 'Left Shot';
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  birthYear: number;
  shotsOnGoal: number;
  shotSprayChart: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  scoringChances: number;
  blockedShots: number;
  penaltiesDrawn: number;
  penaltyMinutes?: number;
  turnovers?: number;
  faceoffWinPercents?: number;
  shortHandedGoals?: number;
  powerPlayGoals?: number;
  rink: PlayerRink;
  level: string;
  createdAt?: Date; // Creation date for sorting
  [key: string]: unknown; // Index signature for compatibility with Record<string, unknown>
}

export interface PlayerTableData {
  players: Player[];
  total: number;
}

export interface PlayerSeasonStats {
  season: string;
  seasonId: number;
  logo: string;
  team: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  shotsOnGoal: number;
  scoringChances: number;
  penaltiesDrawn: number;
  turnovers: number;
  faceOffWinPercentage: number;
}

// API response interface for team-seasons endpoint
export interface PlayerTeamSeasonApiOut {
  player_id: number;
  season_id: number;
  team_id: number;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  shots_on_goal: number;
  scoring_chances: number;
  blocked_shots: number;
  power_play_goals_diff: number;
  penalty_kill_diff: number;
  five_on_five_diff: number;
  overall_diff: number;
  penalties_drawn: string;
  penalty_minutes: string;
  faceoff_win_percents: number;
  short_handed_goals: number;
  power_play_goals: number;
  faceoffs: number;
  faceoffs_won: number;
  turnovers: number;
  shots_on_goal_per_game: number;
}

export interface PlayerRecentGameStats {
  season: string;
  date: string;
  vsTeamName: string;
  vsTeamLogo: string;
  teamName: string;
  teamLogo: string;
  score: string;
  goals: number;
  assists: number;
  points: number;
  shotsOnGoal: number;
  scoringChances: number;
  penaltiesDrawn: number;
  turnovers: number;
  faceOffWinPercentage: number;
}

// API response interface for game-player/player endpoint
export interface GamePlayerOut {
  id: number;
  first_name: string;
  last_name: string;
  season_name: string;
  date: string;
  team_id: number;
  team_name: string;
  team_vs_id: number;
  team_vs_name: string;
  score: string;
  goals: number;
  assists: number;
  shots_on_goal: number;
  scoring_chances: number;
  penalty_minutes: string;
  turnovers: number;
  faceoffs: number;
  faceoffs_won: number;
  faceoff_win_percents: number;
  points: number;
}
