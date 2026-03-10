export enum TryoutStatus {
  TryingOut = 'Trying Out',
  MadeTeam = 'Made Team',
  Cut = 'Cut',
}

export type TryoutEntryType = 'player' | 'goalie';
export type TryoutTabType = 'all' | TryoutEntryType;

export interface PlayerTryoutApiPlayer {
  id: number;
  first_name: string;
  last_name: string;
  number: number;
  position_name: string;
  shoots: string;
  has_analytics: boolean;
}

export interface PlayerTryoutApiOut {
  id: number;
  team_id: number;
  team_name: string;
  status: TryoutStatus;
  note: string | null;
  date: string;
  user: TryoutStatusHistoryUser | null;
  changed_by: TryoutStatusHistoryUser | null;
  changed_at: string | null;
  player: PlayerTryoutApiPlayer;
}

export type PlayerTryoutApiType = 'players' | 'goalies';

export interface PlayerTryoutApiIn {
  player_id: number;
  team_id: number;
  status: TryoutStatus;
  note: string | null;
}

export interface PlayerTryoutApiUpdate {
  status: TryoutStatus;
  note: string | null;
}

export interface TryoutStatusHistoryUser {
  id: number;
  first_name: string;
  last_name: string;
}

export interface TryoutStatusHistoryEntry {
  id: number;
  status: TryoutStatus;
  note: string | null;
  date_time: string;
  user: TryoutStatusHistoryUser;
}

export interface TryoutEntry {
  id: string;
  tryoutId: number;
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
  type: TryoutEntryType;
  status: TryoutStatus;
  hasAnalytics: boolean;
  note: string | null;
  userId: number | null;
  changedBy: string | null;
  changedAt: string | null;
  [key: string]: unknown;
}
