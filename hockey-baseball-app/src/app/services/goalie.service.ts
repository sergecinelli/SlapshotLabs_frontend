import { Injectable, inject } from '@angular/core';
import { Observable, throwError, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Goalie, GoalieTableData, GoalieApiInData, GoalieApiOutData } from '../shared/interfaces/goalie.interface';
import { ApiService } from './api.service';
import { GoalieDataMapper } from '../shared/utils/goalie-data-mapper';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root'
})
export class GoalieService {
  private apiService = inject(ApiService);
  private teamService = inject(TeamService);

  getGoalies(): Observable<GoalieTableData> {
    return forkJoin({
      goalies: this.apiService.get<GoalieApiOutData[]>('/hockey/goalie/list'),
      teams: this.teamService.getTeams()
    }).pipe(
      map(({ goalies: apiGoalies, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map(t => [parseInt(t.id), t.name]));
        
        // Map goalies with team names
        const goalies = apiGoalies.map(apiGoalie => 
          GoalieDataMapper.fromApiOutFormat({ photo: '', data: apiGoalie }, teamMap.get(apiGoalie.team_id))
        );
        return {
          goalies: goalies,
          total: goalies.length
        };
      }),
      catchError(error => {
        console.error('Failed to fetch goalies:', error);
        return throwError(() => error);
      })
    );
  }

  getGoaliesByTeam(teamId: number): Observable<Goalie[]> {
    return this.apiService.get<GoalieApiOutData[]>('/hockey/goalie/list').pipe(
      map(apiGoalies => {
        // Filter goalies by team and map to frontend format
        return apiGoalies
          .filter(apiGoalie => apiGoalie.team_id === teamId)
          .map(apiGoalie => 
            GoalieDataMapper.fromApiOutFormat({ photo: '', data: apiGoalie })
          );
      }),
      catchError(error => {
        console.error(`Failed to fetch goalies for team ${teamId}:`, error);
        return throwError(() => error);
      })
    );
  }

  getGoalieById(id: string): Observable<Goalie | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    return forkJoin({
      goalie: this.apiService.get<GoalieApiOutData>(`/hockey/goalie/${numericId}`),
      teams: this.teamService.getTeams()
    }).pipe(
      map(({ goalie: apiGoalie, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map(t => [parseInt(t.id), t.name]));
        // Single goalie endpoint returns flat object without photo wrapper
        return GoalieDataMapper.fromApiOutFormat({ photo: '', data: apiGoalie }, teamMap.get(apiGoalie.team_id));
      }),
      catchError(error => {
        console.error(`Failed to fetch goalie with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteGoalie(id: string): Observable<boolean> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID for deletion: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    return this.apiService.delete<void>(`/hockey/goalie/${numericId}`).pipe(
      map(() => {
        console.log(`Goalie with ID ${id} deleted successfully`);
        return true;
      }),
      catchError(error => {
        console.error(`Failed to delete goalie with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  addGoalie(goalieData: Partial<Goalie>, photo = ''): Observable<Goalie> {
    // Extract team ID from goalieData or default to 1
    const teamId = (goalieData as Record<string, unknown>)['teamId'] as string | undefined;
    const numericTeamId = teamId ? parseInt(teamId, 10) : 1;
    
    // Transform frontend data to API format
    const apiGoalieData = GoalieDataMapper.toApiInFormat(goalieData, numericTeamId, photo);
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Add photo if provided
    if (photo) {
      formData.append('photo', photo);
    }
    
    // Add data as JSON string
    formData.append('data', JSON.stringify(apiGoalieData.data));
    
    return this.apiService.postMultipart<{ id: number }>('/hockey/goalie', formData).pipe(
      switchMap(response => {
        // Fetch the newly created goalie to get proper team name mapping
        return this.getGoalieById(response.id.toString());
      }),
      map(newGoalie => {
        if (!newGoalie) {
          throw new Error('Failed to fetch newly created goalie');
        }
        console.log(`Added new goalie:`, newGoalie);
        return newGoalie;
      }),
      catchError(error => {
        console.error('Failed to add goalie:', error);
        return throwError(() => error);
      })
    );
  }

  updateGoalie(id: string, goalieData: Partial<Goalie>, photo?: string): Observable<Goalie> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID for update: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    // Extract team ID from goalieData
    const teamId = (goalieData as Record<string, unknown>)['teamId'] as string | undefined;
    const numericTeamId = teamId ? parseInt(teamId, 10) : 1;
    
    // Transform frontend data to API format
    const apiUpdateData = this.toApiPatchFormat(goalieData, numericTeamId);
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Add photo if provided
    if (photo) {
      formData.append('photo', photo);
    }
    
    // Add data as JSON string
    formData.append('data', JSON.stringify(apiUpdateData));
    
    return this.apiService.patchMultipart<void>(`/hockey/goalie/${numericId}`, formData).pipe(
      switchMap(() => {
        // After successful update, fetch the updated goalie data
        return this.getGoalieById(id);
      }),
      map(updatedGoalie => {
        if (!updatedGoalie) {
          throw new Error(`Goalie with ID ${id} not found after update`);
        }
        console.log(`Goalie with ID ${id} updated successfully`);
        return updatedGoalie;
      }),
      catchError(error => {
        console.error(`Failed to update goalie with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Convert year number to date string format (YYYY-MM-DD)
   * @param year - Year as number (e.g. 1995)
   * @returns Date string in YYYY-MM-DD format
   */
  private yearToDateString(year: number): string {
    // Use January 1st of the given year
    return `${year}-01-01`;
  }

  private toApiPatchFormat(goalieData: Partial<Goalie>, teamId: number): GoalieApiInData {
    // Include all fields for PATCH (backend expects full data object)
    return {
      team_id: teamId,
      height: goalieData.height ? GoalieDataMapper.heightStringToInches(goalieData.height) : 0,
      weight: goalieData.weight ?? 0,
      shoots: goalieData.shoots ? GoalieDataMapper.shootsToApiFormat(goalieData.shoots) : 'R',
      number: goalieData.jerseyNumber ?? 0,
      first_name: goalieData.firstName ?? '',
      last_name: goalieData.lastName ?? '',
      birth_year: goalieData.birthYear ? this.yearToDateString(goalieData.birthYear) : this.yearToDateString(new Date().getFullYear()),
      player_bio: goalieData.playerBiography,
      birthplace_country: (goalieData as Record<string, unknown>)['birthplace'] as string | undefined,
      address_country: (goalieData as Record<string, unknown>)['addressCountry'] as string | undefined,
      address_region: (goalieData as Record<string, unknown>)['addressRegion'] as string | undefined,
      address_city: (goalieData as Record<string, unknown>)['addressCity'] as string | undefined,
      address_street: (goalieData as Record<string, unknown>)['addressStreet'] as string | undefined,
      address_postal_code: (goalieData as Record<string, unknown>)['addressPostalCode'] as string | undefined,
      analysis: 'Some analysis'
    };
  }
}
