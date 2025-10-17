import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Goalie, GoalieTableData, GoalieApiOut, GoalieApiIn } from '../shared/interfaces/goalie.interface';
import { ApiService } from './api.service';
import { GoalieDataMapper } from '../shared/utils/goalie-data-mapper';

@Injectable({
  providedIn: 'root'
})
export class GoalieService {
  private apiService = inject(ApiService);

  getGoalies(): Observable<GoalieTableData> {
    return this.apiService.get<GoalieApiOut[]>('/hockey/goalie/list').pipe(
      map(apiGoalies => {
        const goalies = GoalieDataMapper.fromApiOutArrayFormat(apiGoalies);
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

  addGoalie(goalieData: Partial<Goalie>): Observable<Goalie> {
    // Transform frontend data to API format
    const apiGoalieData = GoalieDataMapper.toApiInFormat(goalieData, 1); // Default team_id = 1
    
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

  updateGoalie(id: string, goalieData: Partial<Goalie>): Observable<Goalie> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID for update: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    // Transform frontend data to API format for partial update
    const apiUpdateData = this.toApiPatchFormat(goalieData);
    
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

  private toApiPatchFormat(goalieData: Partial<Goalie>): Partial<GoalieApiIn> {
    const updateData: Partial<GoalieApiIn> = {};
    
    // Only include fields that are provided and exist in the API
    if (goalieData.height) {
      updateData.height = GoalieDataMapper.heightStringToInches(goalieData.height);
    }
    if (goalieData.weight !== undefined) {
      updateData.weight = goalieData.weight;
    }
    if (goalieData.shoots) {
      updateData.shoots = GoalieDataMapper.shootsToApiFormat(goalieData.shoots);
    }
    if (goalieData.jerseyNumber !== undefined) {
      updateData.jersey_number = goalieData.jerseyNumber;
    }
    if (goalieData.firstName) {
      updateData.first_name = goalieData.firstName;
    }
    if (goalieData.lastName) {
      updateData.last_name = goalieData.lastName;
    }
    if (goalieData.birthYear) {
      updateData.birth_year = goalieData.birthYear;
    }
    if (goalieData.wins !== undefined) {
      updateData.wins = goalieData.wins;
    }
    if (goalieData.losses !== undefined) {
      updateData.losses = goalieData.losses;
    }
    
    return updateData;
  }
}
