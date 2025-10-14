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
  shoots: number;  // 1 for Right Shot, 0 for Left Shot
  jersey_number: number;
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
  shoots: number;  // 1 for Right Shot, 0 for Left Shot
  jersey_number: number;
  first_name: string;
  last_name: string;
  birth_year: number;
  goals: number;
  assists: number;
  points: number;
  scoring_chances: number;
  blocked_shots: number;
  penalties_drawn: number;
  games_played: number;
  shot_spray_chart: string;
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
