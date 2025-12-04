export enum Role {
  // Positive roles are used for specific permissions
  Admin = 1,
  Coach = 2,
  Player = 3,

  // Negative roles are used for specific conditions
  Unknown = -1,
  Author = -2,
  CoachOfTeam = -3,
}

export interface IPageAccessMap {
  allowed?: Role[];
  denied?: Role[];
}