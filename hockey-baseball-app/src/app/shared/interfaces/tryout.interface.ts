export type TryoutTabType = 'player' | 'goalie';

export interface TryoutEntry {
  id: string;
  playerId: string;
  firstName: string;
  lastName: string;
  position: string;
  shoots: string;
  jerseyNumber: number;
  team: string;
  teamId?: number;
  teamLogo?: string;
  teamAgeGroup?: string;
  teamLevelName?: string;
  type: TryoutTabType;
  [key: string]: unknown;
}
