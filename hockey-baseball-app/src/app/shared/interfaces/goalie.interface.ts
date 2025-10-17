export interface GoalieRink {
  facilityName: string;
  rinkName: string;
  city: string;
  address: string;
}

// API Schema interfaces - matching backend
export interface GoalieApiIn {
  team_id: number;
  height: number;  // Height in inches
  weight: number;  // Weight in lbs
  shoots: string;  // "R" for Right Shot, "L" for Left Shot
  jersey_number: number;
  first_name: string;
  last_name: string;
  birth_year: string;  // Date format: YYYY-MM-DD
  wins: number;
  losses: number;
  position_id: number;  // Position ID, 0 by default for goalies
}

export interface GoalieApiOut {
  id: number;
  team_id: number;
  height: number;  // Height in inches
  weight: number;  // Weight in lbs
  shoots: string;  // "R" for Right Shot, "L" for Left Shot
  jersey_number: number;
  first_name: string;
  last_name: string;
  birth_year: string;  // Date format
  wins: number;
  losses: number;
  position_id: number;
  shots_on_goal: number;
  saves: number;
  goals_against: number;
  games_played: number;
  goals: number;
  assists: number;
  short_handed_goals_against: number;
  power_play_goals_against: number;
  shots_on_goal_per_game: number;
  points: number;
}

// Frontend interface - keeping existing structure for compatibility
export interface Goalie {
  id: string;
  team: string;
  level: string;
  position: string;
  height: string;  // e.g., "5'6""
  weight: number;  // in lbs
  shoots: 'Right Shot' | 'Left Shot';
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  birthYear: number;
  country?: string;  // Optional country field
  shotsOnGoal: number;
  saves: number;
  goalsAgainst: number;
  shotsOnGoalPerGame: number;
  rink: GoalieRink;
  gamesPlayed: number;
  wins: number;
  losses: number;
  goals: number;
  assists: number;
  points: number;
  ppga: number;  // Power Play Goals Against
  shga: number;  // Short Handed Goals Against
  savesAboveAvg: number;
  createdAt?: Date;  // Creation date for sorting
  [key: string]: unknown;  // Index signature for compatibility with Record<string, unknown>
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
