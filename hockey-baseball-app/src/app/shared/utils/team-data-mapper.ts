import { Team, TeamApiIn, TeamApiOut } from '../interfaces/team.interface';

/**
 * Utility class for transforming data between frontend and API formats for teams
 */
export class TeamDataMapper {
  
  /**
   * Transform API TeamApiOut data to frontend Team format
   * @param apiTeam - API team data
   * @returns Team object
   */
  static fromApiOutFormat(apiTeam: TeamApiOut): Team {
    return {
      id: apiTeam.id.toString(),
      name: apiTeam.name,
      group: apiTeam.group || 'Eastern Conference',
      level: this.mapLevelIdToName(apiTeam.level_id),
      division: this.mapDivisionIdToName(apiTeam.division_id),
      city: apiTeam.city || '',
      logo: apiTeam.logo || '/assets/icons/teams.svg',
      createdAt: new Date() // Set creation date for newly created items
    };
  }

  /**
   * Transform frontend Team data to API TeamIn format for creating
   * @param team - Frontend team data
   * @returns TeamApiIn object
   */
  static toApiInFormat(team: Partial<Team>): TeamApiIn {
    return {
      name: team.name || '',
      group: team.group || 'Eastern Conference',
      level_id: this.mapLevelNameToId(team.level || 'NHL'),
      division_id: this.mapDivisionNameToId(team.division || 'Atlantic'),
      age_group: 'Adult', // Default age group
      city: team.city || '',
      logo: team.logo
    };
  }

  /**
   * Transform frontend Team data to API partial update format
   * @param team - Frontend team data
   * @returns Partial TeamApiIn object
   */
  static toApiUpdateFormat(team: Partial<Team>): Partial<TeamApiIn> {
    const updateData: Partial<TeamApiIn> = {};
    
    if (team.name) {
      updateData.name = team.name;
    }
    if (team.group) {
      updateData.group = team.group;
    }
    if (team.level) {
      updateData.level_id = this.mapLevelNameToId(team.level);
    }
    if (team.division) {
      updateData.division_id = this.mapDivisionNameToId(team.division);
    }
    if (team.city) {
      updateData.city = team.city;
    }
    if (team.logo) {
      updateData.logo = team.logo;
    }
    
    return updateData;
  }

  /**
   * Transform an array of API teams to frontend format
   * @param apiTeams - Array of API team data
   * @returns Array of frontend Team objects
   */
  static fromApiOutArrayFormat(apiTeams: TeamApiOut[]): Team[] {
    return apiTeams.map(apiTeam => this.fromApiOutFormat(apiTeam));
  }

  /**
   * Map level ID to level name
   * @param levelId - Level ID from API
   * @returns Level name string
   */
  private static mapLevelIdToName(levelId: number): string {
    const levelMap: Record<number, string> = {
      1: 'NHL',
      2: 'AHL', 
      3: 'Junior A',
      4: 'Junior B',
      5: 'Junior C'
    };
    return levelMap[levelId] || 'NHL';
  }

  /**
   * Map level name to level ID
   * @param level - Level name
   * @returns Level ID number
   */
  private static mapLevelNameToId(level: string): number {
    const levelMap: Record<string, number> = {
      'NHL': 1,
      'AHL': 2,
      'Junior A': 3,
      'Junior B': 4,
      'Junior C': 5
    };
    return levelMap[level] || 1;
  }

  /**
   * Map division ID to division name
   * @param divisionId - Division ID from API
   * @returns Division name string
   */
  private static mapDivisionIdToName(divisionId: number): string {
    const divisionMap: Record<number, string> = {
      1: 'Atlantic',
      2: 'Metropolitan',
      3: 'Central',
      4: 'Pacific'
    };
    return divisionMap[divisionId] || 'Atlantic';
  }

  /**
   * Map division name to division ID
   * @param division - Division name
   * @returns Division ID number
   */
  private static mapDivisionNameToId(division: string): number {
    const divisionMap: Record<string, number> = {
      'Atlantic': 1,
      'Metropolitan': 2,
      'Central': 3,
      'Pacific': 4
    };
    return divisionMap[division] || 1;
  }
}