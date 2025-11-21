export interface Schedule extends Record<string, unknown> {
  id: string;
  homeTeam: string;
  homeTeamId?: number;
  homeTeamLogo?: string;
  homeGoals: number;
  homeTeamGoalie: string;
  awayTeam: string;
  awayTeamId?: number;
  awayTeamLogo?: string;
  awayGoals: number;
  awayTeamGoalie: string;
  gameType: GameType;
  tournamentName?: string; // Only for Tournament type
  date: string; // Format: "Month Day, Year"
  time: string; // Format: "HH:MM [AM/PM]"
  rink: string; // Format: "<Facility Name> - <Rink Name>"
  status: GameStatus;
  events: GameEvent[];
}

export interface GameEvent {
  id: string; // auto generated - sequential order
  eventName: GameEventType;
  time?: string;
  period: GamePeriod;
  team: string; // "<team name> <group> <level>"
  teamLogo?: string;
  playerName?: string;
}

export enum GameType {
  RegularSeason = 'Regular Season',
  Playoff = 'Playoff',
  Tournament = 'Tournament',
  Exhibition = 'Exhibition',
  SummerLeague = 'Summer League',
}

export enum GameStatus {
  NotStarted = 1,
  GameInProgress = 2,
  GameOver = 3,
}

export enum GameEventType {
  ShotOnGoal = 'Shot on Goal',
  ScoringChance = 'Scoring Chance (NOT counted as a shot on goal)',
  Penalty = 'Penalty',
  Goal = 'Goal',
  Assist = 'Assist',
  Turnover = 'Turnover',
  FaceoffWin = 'Faceoff Win',
  FaceoffLoss = 'Faceoff Loss',
  GoalieChange = 'Goalie Change (change the goalie that is in the game)',
}

export enum GamePeriod {
  FirstPeriod = '1st Period',
  SecondPeriod = '2nd Period',
  ThirdPeriod = '3rd Period',
  Overtime = 'Overtime',
  ShootOut = 'Shoot Out',
}

// Zone-specific event types for the detailed tracking
export interface ZoneEvent {
  type: 'Defensive Zone Exit' | 'Offensive Zone Entry' | 'Shots' | 'Turnover';
  team: 'Home' | 'Visiting';
  eventDetails: string;
}

export enum DefensiveZoneExitType {
  Icing = 'Icing',
  SkateOut = 'Skate Out',
  SOWin = 'SO & Win',
  SOLose = 'SO & Lose',
  Pass = 'Pass',
}

export enum OffensiveZoneEntryType {
  PassIn = 'Pass In',
  DumpWin = 'Dump & Win',
  DumpLose = 'Dump & Lose',
  SkateIn = 'Skate In',
}

export enum ShotType {
  ShotOnGoal = 'Shot on Goal',
  MissedNet = 'Missed Net',
  ScoringChance = 'Scoring Chance',
  Blocked = 'Blocked',
}

export enum TurnoverType {
  OffZone = 'Off Zone',
  NeutralZone = 'Neutral Zone',
  DefZone = 'Def. Zone',
}
