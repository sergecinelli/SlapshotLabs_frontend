import { Goalie, GoalieApiIn, GoalieApiOut } from '../interfaces/goalie.interface';

/**
 * Utility class for transforming data between frontend and API formats
 */
export class GoalieDataMapper {
  
  /**
   * Convert feet'inches format to total inches
   * @param heightStr - Height string like "5'10" or "6'2""
   * @returns Height in inches
   */
  static heightStringToInches(heightStr: string): number {
    if (!heightStr) return 0;
    
    const match = heightStr.match(/(\d+)'(\d+)/);
    if (!match) {
      // Try to parse as just a number
      const parsed = parseInt(heightStr);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    const feet = parseInt(match[1]);
    const inches = parseInt(match[2]);
    return (feet * 12) + inches;
  }

  /**
   * Convert inches to feet'inches format
   * @param inches - Height in inches
   * @returns Height string like "5'10""
   */
  static inchesToHeightString(inches: number): string {
    if (!inches || inches <= 0) return '';
    
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    return `${feet}'${remainingInches}"`;
  }

  /**
   * Convert frontend shoots format to API format
   * @param shoots - "Right Shot" or "Left Shot"
   * @returns "R" for Right Shot, "L" for Left Shot
   */
  static shootsToApiFormat(shoots: string): string {
    return shoots === 'Right Shot' ? 'R' : 'L';
  }

  /**
   * Convert API shoots format to frontend format
   * @param shoots - "R" for Right Shot, "L" for Left Shot
   * @returns "Right Shot" or "Left Shot"
   */
  static shootsFromApiFormat(shoots: string): 'Right Shot' | 'Left Shot' {
    return shoots === 'R' ? 'Right Shot' : 'Left Shot';
  }

  /**
   * Transform frontend Goalie data to API GoalieIn format for creating
   * @param goalie - Frontend goalie data
   * @param teamId - Team ID (required by API)
   * @returns GoalieApiIn object
   */
  static toApiInFormat(goalie: Partial<Goalie>, teamId = 1): GoalieApiIn {
    return {
      team_id: teamId,
      height: this.heightStringToInches(goalie.height || ''),
      weight: goalie.weight || 0,
      shoots: this.shootsToApiFormat(goalie.shoots || 'Right Shot'),
      jersey_number: goalie.jerseyNumber || 0,
      first_name: goalie.firstName || '',
      last_name: goalie.lastName || '',
      birth_year: this.yearToDateString(goalie.birthYear || new Date().getFullYear()),
      wins: goalie.wins || 0,
      losses: goalie.losses || 0,
      position_id: 6  // Default position_id for goalies
    };
  }

  /**
   * Transform API GoalieApiOut data to frontend Goalie format
   * @param apiGoalie - API goalie data
   * @param teamName - Optional team name (since API only has team_id)
   * @returns Goalie object
   */
  static fromApiOutFormat(apiGoalie: GoalieApiOut, teamName?: string): Goalie {
    return {
      id: apiGoalie.id.toString(),
      team: teamName || `Team ${apiGoalie.team_id}`,
      level: 'Professional', // Default value since not in API
      position: 'Goalie',
      height: this.inchesToHeightString(apiGoalie.height),
      weight: apiGoalie.weight,
      shoots: this.shootsFromApiFormat(apiGoalie.shoots),
      jerseyNumber: apiGoalie.jersey_number,
      firstName: apiGoalie.first_name,
      lastName: apiGoalie.last_name,
      birthYear: this.dateStringToYear(apiGoalie.birth_year),
      shotsOnGoal: apiGoalie.shots_on_goal,
      saves: apiGoalie.saves,
      goalsAgainst: apiGoalie.goals_against,
      shotsOnGoalPerGame: apiGoalie.shots_on_goal_per_game,
      rink: {
        facilityName: 'Default Facility',
        rinkName: 'Main Rink',
        city: 'City',
        address: 'Address'
      },
      gamesPlayed: apiGoalie.games_played,
      wins: apiGoalie.wins,
      losses: apiGoalie.losses,
      goals: apiGoalie.goals,
      assists: apiGoalie.assists,
      points: apiGoalie.points,
      ppga: apiGoalie.power_play_goals_against, // Using power_play_goals_against for ppga
      shga: apiGoalie.short_handed_goals_against, // Using short_handed_goals_against for shga
      savesAboveAvg: 0, // Field not available in API
      createdAt: new Date() // Set creation date for newly created items
    };
  }

  /**
   * Transform an array of API goalies to frontend format
   * @param apiGoalies - Array of API goalie data
   * @returns Array of frontend Goalie objects
   */
  static fromApiOutArrayFormat(apiGoalies: GoalieApiOut[]): Goalie[] {
    return apiGoalies.map(apiGoalie => this.fromApiOutFormat(apiGoalie));
  }

  /**
   * Convert year number to date string format (YYYY-MM-DD)
   * @param year - Year as number (e.g. 1995)
   * @returns Date string in YYYY-MM-DD format
   */
  private static yearToDateString(year: number): string {
    // Use January 1st of the given year
    return `${year}-01-01`;
  }

  /**
   * Convert date string to year number
   * @param dateString - Date string in YYYY-MM-DD format
   * @returns Year as number
   */
  private static dateStringToYear(dateString: string): number {
    const date = new Date(dateString);
    return date.getFullYear();
  }
}
