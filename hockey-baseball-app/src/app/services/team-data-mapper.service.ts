import { Injectable, inject } from '@angular/core';
import { Team, TeamApiIn, TeamApiOut } from '../shared/interfaces/team.interface';
import { TeamOptionsService } from './team-options.service';

@Injectable({
  providedIn: 'root'
})
export class TeamDataMapperService {
  private teamOptionsService = inject(TeamOptionsService);

  /**
   * Transform API TeamApiOut data to frontend Team format
   */
  fromApiOutFormat(apiTeam: TeamApiOut): Team {
    return {
      id: apiTeam.id.toString(),
      name: apiTeam.name,
      group: apiTeam.group || '1U',
      level: this.teamOptionsService.getLevelName(apiTeam.level_id),
      division: this.teamOptionsService.getDivisionName(apiTeam.division_id),
      city: apiTeam.city || '',
      logo: apiTeam.logo || '/assets/icons/teams.svg',
      createdAt: new Date()
    };
  }

  /**
   * Transform frontend Team data to API TeamIn format for creating
   */
  toApiInFormat(team: Partial<Team>): TeamApiIn {
    return {
      name: team.name || '',
      group: team.group || '1U',
      level_id: this.teamOptionsService.getLevelId(team.level || 'NHL'),
      division_id: this.teamOptionsService.getDivisionId(team.division || 'Atlantic'),
      age_group: 'Adult', // Default age group
      city: team.city || '',
      logo: team.logo
    };
  }

  /**
   * Transform frontend Team data to API partial update format
   */
  toApiUpdateFormat(team: Partial<Team>): Partial<TeamApiIn> {
    const updateData: Partial<TeamApiIn> = {};
    
    if (team.name) {
      updateData.name = team.name;
    }
    if (team.group) {
      updateData.group = team.group;
    }
    if (team.level) {
      updateData.level_id = this.teamOptionsService.getLevelId(team.level);
    }
    if (team.division) {
      updateData.division_id = this.teamOptionsService.getDivisionId(team.division);
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
   */
  fromApiOutArrayFormat(apiTeams: TeamApiOut[]): Team[] {
    return apiTeams.map(apiTeam => this.fromApiOutFormat(apiTeam));
  }
}