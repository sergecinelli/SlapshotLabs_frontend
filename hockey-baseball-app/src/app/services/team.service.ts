import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Team, TeamTableData, TeamApiOut } from '../shared/interfaces/team.interface';
import { ApiService } from './api.service';
import { TeamDataMapperService } from './team-data-mapper.service';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private apiService = inject(ApiService);
  private teamDataMapper = inject(TeamDataMapperService);

  getTeams(): Observable<TeamTableData> {
    return this.apiService.get<TeamApiOut[]>('/hockey/team/list').pipe(
      map(apiTeams => {
        const teams = this.teamDataMapper.fromApiOutArrayFormat(apiTeams);
        return {
          teams: teams,
          total: teams.length
        };
      }),
      catchError(error => {
        console.error('Failed to fetch teams:', error);
        return throwError(() => error);
      })
    );
  }

  getTeamById(id: string): Observable<Team | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid team ID: ${id}`);
      return throwError(() => new Error(`Invalid team ID: ${id}`));
    }

    return this.apiService.get<TeamApiOut>(`/hockey/team/${numericId}`).pipe(
      map(apiTeam => this.teamDataMapper.fromApiOutFormat(apiTeam)),
      catchError(error => {
        console.error(`Failed to fetch team with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteTeam(id: string): Observable<boolean> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid team ID for deletion: ${id}`);
      return throwError(() => new Error(`Invalid team ID: ${id}`));
    }

    return this.apiService.delete<void>(`/hockey/team/${numericId}`).pipe(
      map(() => {
        console.log(`Team with ID ${id} deleted successfully`);
        return true;
      }),
      catchError(error => {
        console.error(`Failed to delete team with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  addTeam(teamData: Partial<Team>, logoFile?: File): Observable<Team> {
    // Transform frontend data to API format
    const apiTeamData = this.teamDataMapper.toApiInFormat(teamData);
    
    // Create FormData for multipart request
    const formData = new FormData();
    formData.append('data', JSON.stringify(apiTeamData));
    
    // Add logo file if provided
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    
    return this.apiService.postMultipart<{ id: number }>('/hockey/team', formData).pipe(
      map(response => {
        // Create a complete team object with the returned ID
        const newTeam: Team = {
          id: response.id.toString(),
          name: teamData.name || 'New Team',
          group: teamData.group || 'Eastern Conference',
          level: teamData.level || 'NHL',
          division: teamData.division || 'Atlantic',
          city: teamData.city || '',
          logo: teamData.logo || '/assets/icons/teams.svg',
          createdAt: new Date() // Set creation date
        };
        
        console.log(`Added new team:`, newTeam);
        return newTeam;
      }),
      catchError(error => {
        console.error('Failed to add team:', error);
        return throwError(() => error);
      })
    );
  }

  updateTeam(id: string, teamData: Partial<Team>, logoFile?: File): Observable<Team> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid team ID for update: ${id}`);
      return throwError(() => new Error(`Invalid team ID: ${id}`));
    }

    const apiUpdateData = this.teamDataMapper.toApiUpdateFormat(teamData);
    
    // Create FormData for multipart request
    const formData = new FormData();
    formData.append('data', JSON.stringify(apiUpdateData));
    
    // Add logo file if provided
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    
    return this.apiService.patchMultipart<void>(`/hockey/team/${numericId}`, formData).pipe(
      switchMap(() => {
        // After successful update, fetch the updated team data
        return this.getTeamById(id);
      }),
      map(updatedTeam => {
        if (!updatedTeam) {
          throw new Error(`Team with ID ${id} not found after update`);
        }
        console.log(`Team with ID ${id} updated successfully`);
        return updatedTeam;
      }),
      catchError(error => {
        console.error(`Failed to update team with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get team logo
   */
  getTeamLogo(id: string): Observable<Blob> {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid team ID for logo: ${id}`);
      return throwError(() => new Error(`Invalid team ID: ${id}`));
    }

    return this.apiService.get<Blob>(`/hockey/team/${numericId}/logo`).pipe(
      catchError(error => {
        console.error(`Failed to fetch logo for team with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

}
