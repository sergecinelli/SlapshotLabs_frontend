import { Injectable, inject } from '@angular/core';
import { Team, TeamApiIn, TeamApiOut } from '../shared/interfaces/team.interface';
import { TeamOptionsService } from './team-options.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
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
      group: apiTeam.age_group || '1U', // Use age_group as group
      level: this.teamOptionsService.getLevelName(apiTeam.level_id),
      levelId: apiTeam.level_id, // Store ID for form selection
      division: this.teamOptionsService.getDivisionName(apiTeam.division_id),
      divisionId: apiTeam.division_id, // Store ID for form selection
      city: apiTeam.city || '',
      abbreviation: apiTeam.abbreviation,
      logo: `${environment.apiUrl}/hockey/team/${apiTeam.id}/logo`, // Logo fetched from separate endpoint
      createdAt: new Date(),
      gamesPlayed: apiTeam.games_played,
      goalsFor: apiTeam.goals_for,
      goalsAgainst: apiTeam.goals_against,
      wins: apiTeam.wins,
      losses: apiTeam.losses,
      ties: apiTeam.ties,
      points: apiTeam.points,
    };
  }

  /**
   * Transform frontend Team data to API TeamIn format for creating
   */
  toApiInFormat(team: Partial<Team>): TeamApiIn {
    return {
      name: team.name || '',
      age_group: team.group || '1U',
      level_id: this.teamOptionsService.getLevelId(team.level || 'NHL'),
      division_id: this.teamOptionsService.getDivisionId(team.division || 'Atlantic'),
      city: team.city || '',
      abbreviation: team.abbreviation,
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
      updateData.age_group = team.group;
    }
    // Use levelId if available (from form), otherwise derive from level name
    if (team.levelId !== undefined) {
      updateData.level_id = team.levelId;
    } else if (team.level) {
      updateData.level_id = this.teamOptionsService.getLevelId(team.level);
    }
    // Use divisionId if available (from form), otherwise derive from division name
    if (team.divisionId !== undefined) {
      updateData.division_id = team.divisionId;
    } else if (team.division) {
      updateData.division_id = this.teamOptionsService.getDivisionId(team.division);
    }
    if (team.city !== undefined) {
      updateData.city = team.city;
    }
    if (team.abbreviation !== undefined) {
      updateData.abbreviation = team.abbreviation;
    }

    return updateData;
  }

  /**
   * Transform an array of API teams to frontend format
   */
  fromApiOutArrayFormat(apiTeams: TeamApiOut[]): Team[] {
    return apiTeams.map((apiTeam) => this.fromApiOutFormat(apiTeam));
  }
}
