export interface PlayerRink {
  facilityName: string;
  rinkName: string;
  city: string;
  address: string;
}

// API Schema interfaces - matching backend
export interface PlayerApiIn {
  team_id: number;
  position_id: number;
  height: number;  // Height in inches
  weight: number;  // Weight in lbs
  shoots: string;  // "R" for Right Shot, "L" for Left Shot
  number: number;  // Jersey number
  first_name: string;
  last_name: string;
  birth_year: number;
  goals: number;
  assists: number;
  points: number;
  scoring_chances: number;
  blocked_shots: number;
  penalties_drawn: number;
}

export interface PlayerApiOut {
  id: number;
  team_id: number;
  position_id: number;
  height: number;  // Height in inches
  weight: number;  // Weight in lbs
  shoots: string;  // "R" for Right Shot, "L" for Left Shot
  number: number;  // Jersey number (named "number" in API)
  first_name: string;
  last_name: string;
  birth_year: string;  // Date format
  goals: number;
  assists: number;
  points: number;
  scoring_chances: number;
  blocked_shots: number;
  penalties_drawn: number;
  penalties_taken: number;
  games_played: number;
  shots_on_goal: number;
  shots_on_goal_per_game: number;
  five_on_five_diff: number;
  overall_diff: number;
  penalty_kill_diff: number;
  power_play_goals_diff: number;
}

// Frontend interface - keeping structure similar to goalies
export interface Player {
  id: string;
  team: string;
  position: 'Left Wing' | 'Center' | 'Right Wing' | 'Left Defense' | 'Right Defense';
  height: string;  // e.g., "5'6""
  weight: number;  // in lbs
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
  rink: PlayerRink;
  level: string;
  createdAt?: Date;  // Creation date for sorting
  [key: string]: unknown;  // Index signature for compatibility with Record<string, unknown>
}

export interface PlayerTableData {
  players: Player[];
  total: number;
}

export interface PlayerSeasonStats {
  season: string;
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

export interface PlayerRecentGameStats {
  season: string;
  date: string;
  vs: string;
  teamLogo: string;
  team: string;
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
