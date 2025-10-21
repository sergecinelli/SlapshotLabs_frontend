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
   * @param photo - Photo string (base64 or URL)
   * @returns GoalieApiIn object
   */
  static toApiInFormat(goalie: Partial<Goalie>, teamId = 1, photo = ''): GoalieApiIn {
    return {
      ...(photo ? { photo } : {}),
      data: {
        team_id: teamId,
        height: this.heightStringToInches(goalie.height || ''),
        weight: goalie.weight || 0,
        shoots: this.shootsToApiFormat(goalie.shoots || 'Right Shot'),
        jersey_number: goalie.jerseyNumber || 0,
        first_name: goalie.firstName || '',
        last_name: goalie.lastName || '',
        birth_year: this.yearToDateString(goalie.birthYear || new Date().getFullYear()),
        player_bio: goalie.playerBiography,
        birthplace_country: goalie.country,
        birthplace_region: goalie.address ? this.extractRegion(goalie.birthplace) : undefined,
        birthplace_city: this.extractCity(goalie.birthplace),
        address_country: goalie.country,
        address_region: this.extractRegion(goalie.address),
        address_city: this.extractCity(goalie.address),
        wins: goalie.wins || 0,
        losses: goalie.losses || 0,
        penalty_minutes: 0,
        analysis: undefined
      }
    };
  }

  /**
   * Transform API GoalieApiOut data to frontend Goalie format
   * @param apiGoalie - API goalie data
   * @param teamName - Optional team name (since API only has team_id)
   * @returns Goalie object
   */
  static fromApiOutFormat(apiGoalie: GoalieApiOut, teamName?: string): Goalie {
    const data = apiGoalie.data;
    return {
      id: data.id.toString(),
      team: teamName || `Team ${data.team_id}`,
      level: 'Professional', // Default value since not in API
      position: 'Goalie',
      height: this.inchesToHeightString(data.height),
      weight: data.weight,
      shoots: this.shootsFromApiFormat(data.shoots),
      jerseyNumber: data.jersey_number,
      firstName: data.first_name,
      lastName: data.last_name,
      birthYear: this.dateStringToYear(data.birth_year),
      playerBiography: data.player_bio,
      birthplace: this.combineLocation(data.birthplace_city, data.birthplace_region, data.birthplace_country),
      address: this.combineLocation(data.address_city, data.address_region, data.address_country),
      country: data.birthplace_country || data.address_country,
      shotsOnGoal: data.shots_on_goal || 0,
      saves: data.saves || 0,
      goalsAgainst: data.goals_against || 0,
      shotsOnGoalPerGame: data.shots_on_goal_per_game || 0,
      rink: {
        facilityName: 'Default Facility',
        rinkName: 'Main Rink',
        city: 'City',
        address: 'Address'
      },
      gamesPlayed: data.games_played || 0,
      wins: data.wins,
      losses: data.losses,
      goals: data.goals || 0,
      assists: data.assists || 0,
      points: data.points || 0,
      ppga: data.power_play_goals_against || 0,
      shga: data.short_handed_goals_against || 0,
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

  /**
   * Combine location parts into a single string
   * @param city - City name
   * @param region - Region/state/province
   * @param country - Country name
   * @returns Combined location string
   */
  private static combineLocation(city?: string, region?: string, country?: string): string {
    const parts = [city, region, country].filter(p => p && p.trim());
    return parts.join(', ');
  }

  /**
   * Extract city from location string
   * @param location - Location string like "City, Region, Country"
   * @returns City name
   */
  private static extractCity(location?: string): string | undefined {
    if (!location) return undefined;
    const parts = location.split(',').map(p => p.trim());
    return parts[0] || undefined;
  }

  /**
   * Extract region from location string
   * @param location - Location string like "City, Region, Country"
   * @returns Region name
   */
  private static extractRegion(location?: string): string | undefined {
    if (!location) return undefined;
    const parts = location.split(',').map(p => p.trim());
    return parts[1] || undefined;
  }
}
