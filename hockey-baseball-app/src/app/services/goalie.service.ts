import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Goalie, GoalieTableData, GoalieApiOut, GoalieApiIn, GoalieApiPatch, GoalieApiInData } from '../shared/interfaces/goalie.interface';
import { ApiService } from './api.service';
import { GoalieDataMapper } from '../shared/utils/goalie-data-mapper';

@Injectable({
  providedIn: 'root'
})
export class GoalieService {
  private apiService = inject(ApiService);

  getGoalies(): Observable<GoalieTableData> {
    return this.apiService.get<any[]>('/hockey/goalie/list').pipe(
      map(apiGoalies => {
        // /list endpoint returns flat objects without photo wrapper
        const goalies = apiGoalies.map(apiGoalie => 
          GoalieDataMapper.fromApiOutFormat({ photo: '', data: apiGoalie })
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

  getGoalieById(id: string): Observable<Goalie | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    return this.apiService.get<GoalieApiOut>(`/hockey/goalie/${numericId}`).pipe(
      map(apiGoalie => GoalieDataMapper.fromApiOutFormat(apiGoalie)),
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
    // Transform frontend data to API format with photo wrapper
    const apiGoalieData = GoalieDataMapper.toApiInFormat(goalieData, 1, photo); // Default team_id = 1
    
    return this.apiService.post<{ id: number }>('/hockey/goalie', apiGoalieData).pipe(
      map(response => {
        // Create a complete goalie object with the returned ID
        const newGoalie: Goalie = {
          id: response.id.toString(),
          ...goalieData,
          // Ensure all required fields are present
          team: goalieData.team || 'Team 1',
          level: goalieData.level || 'Professional',
          position: 'Goalie',
          rink: goalieData.rink || {
            facilityName: 'Default Facility',
            rinkName: 'Main Rink',
            city: 'City',
            address: 'Address'
          },
          createdAt: new Date() // Set creation date
        } as Goalie;
        
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

    // Transform frontend data to API format for partial update
    const apiUpdateData = this.toApiPatchFormat(goalieData, photo);
    
    return this.apiService.patch<void>(`/hockey/goalie/${numericId}`, apiUpdateData).pipe(
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

  private toApiPatchFormat(goalieData: Partial<Goalie>, photo?: string): GoalieApiPatch {
    const dataUpdate: Partial<GoalieApiInData> = {};
    
    // Only include fields that are provided and exist in the API
    if (goalieData.height) {
      dataUpdate.height = GoalieDataMapper.heightStringToInches(goalieData.height);
    }
    if (goalieData.weight !== undefined) {
      dataUpdate.weight = goalieData.weight;
    }
    if (goalieData.shoots) {
      dataUpdate.shoots = GoalieDataMapper.shootsToApiFormat(goalieData.shoots);
    }
    if (goalieData.jerseyNumber !== undefined) {
      dataUpdate.jersey_number = goalieData.jerseyNumber;
    }
    if (goalieData.firstName) {
      dataUpdate.first_name = goalieData.firstName;
    }
    if (goalieData.lastName) {
      dataUpdate.last_name = goalieData.lastName;
    }
    if (goalieData.birthYear) {
      dataUpdate.birth_year = this.yearToDateString(goalieData.birthYear);
    }
    if (goalieData.wins !== undefined) {
      dataUpdate.wins = goalieData.wins;
    }
    if (goalieData.losses !== undefined) {
      dataUpdate.losses = goalieData.losses;
    }
    
    const patchData: GoalieApiPatch = {};
    if (Object.keys(dataUpdate).length > 0) {
      patchData.data = dataUpdate;
    }
    if (photo !== undefined) {
      patchData.photo = photo;
    }
    
    return patchData;
  }
}
