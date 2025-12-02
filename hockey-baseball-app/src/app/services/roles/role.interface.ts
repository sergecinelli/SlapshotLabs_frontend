export enum Role {
  Admin = 'admin',
  Coach = 'coach',
  Player = 'player',
  Unknown = 'unknown',
}

export interface IPageAccessMap {
  allowed?: Role[];
  denied?: Role[];
}

