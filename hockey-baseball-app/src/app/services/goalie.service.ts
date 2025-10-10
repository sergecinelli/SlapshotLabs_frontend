import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Goalie, GoalieTableData, GoalieApiOut, GoalieApiIn } from '../shared/interfaces/goalie.interface';
import { ApiService } from './api.service';
import { GoalieDataMapper } from '../shared/utils/goalie-data-mapper';

@Injectable({
  providedIn: 'root'
})
export class GoalieService {
  private readonly mockDataPath = '/assets/data/goalies-mock.json';

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  getGoalies(): Observable<GoalieTableData> {
    return this.apiService.get<GoalieApiOut[]>('/hockey/goalies').pipe(
      map(apiGoalies => {
        const goalies = GoalieDataMapper.fromApiOutArrayFormat(apiGoalies);
        return {
          goalies: goalies,
          total: goalies.length
        };
      }),
      catchError(error => {
        console.error('Failed to fetch goalies:', error);
        // Fallback to mock data if API fails
        return this.http.get<GoalieTableData>(this.mockDataPath).pipe(
          delay(500)
        );
      })
    );
  }

  getGoalieById(id: string): Observable<Goalie | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      // If ID is not numeric, fall back to filtering mock data
      return new Observable<Goalie | undefined>(observer => {
        this.getGoalies().subscribe(data => {
          const goalie = data.goalies.find(g => g.id === id);
          observer.next(goalie);
          observer.complete();
        });
      });
    }

    return this.apiService.get<GoalieApiOut>(`/hockey/goalie/${numericId}`).pipe(
      map(apiGoalie => GoalieDataMapper.fromApiOutFormat(apiGoalie)),
      catchError(error => {
        console.error(`Failed to fetch goalie with ID ${id}:`, error);
        // Fallback to mock data search
        return new Observable<Goalie | undefined>(observer => {
          this.getGoalies().subscribe(data => {
            const goalie = data.goalies.find(g => g.id === id);
            observer.next(goalie);
            observer.complete();
          });
        });
      })
    );
  }

  // Mock methods for future implementation
  deleteGoalie(id: string): Observable<boolean> {
    // Simulate delete operation
    console.log(`Delete goalie with ID: ${id}`);
    return of(true).pipe(delay(300));
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
          }
        } as Goalie;
        
        console.log(`Added new goalie:`, newGoalie);
        return newGoalie;
      }),
      catchError(error => {
        console.error('Failed to add goalie:', error);
        // Fallback to mock behavior
        const newGoalie: Goalie = {
          id: 'goalie-' + Date.now().toString(),
          ...goalieData
        } as Goalie;
        return of(newGoalie).pipe(delay(300));
      })
    );
  }

  updateGoalie(id: string, goalieData: Partial<Goalie>): Observable<Goalie> {
    // Simulate update operation
    const updatedGoalie: Goalie = {
      id,
      ...goalieData
    } as Goalie;
    console.log(`Update goalie with ID ${id}:`, updatedGoalie);
    return of(updatedGoalie).pipe(delay(300));
  }
}
