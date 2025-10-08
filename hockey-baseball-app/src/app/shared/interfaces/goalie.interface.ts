export interface GoalieRink {
  facilityName: string;
  rinkName: string;
  city: string;
  address: string;
}

export interface Goalie {
  id: string;
  team: string;
  level: string;
  position: string;
  height: string;  // e.g., "5'6\""
  weight: number;  // in lbs
  shoots: 'Right Shot' | 'Left Shot';
  jerseyNumber: number;
  firstName: string;
  lastName: string;
  birthYear: number;
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
}

export interface GoalieTableData {
  goalies: Goalie[];
  total: number;
}
