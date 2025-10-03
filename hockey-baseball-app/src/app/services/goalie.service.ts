import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { Goalie, GoalieTableData } from '../shared/interfaces/goalie.interface';

@Injectable({
  providedIn: 'root'
})
export class GoalieService {
  private readonly mockDataPath = '/assets/data/goalies-mock.json';

  constructor(private http: HttpClient) {}

  getGoalies(): Observable<GoalieTableData> {
    // Simulate network delay
    return this.http.get<GoalieTableData>(this.mockDataPath).pipe(
      delay(500) // Add 500ms delay to simulate network request
    );
  }

  getGoalieById(id: string): Observable<Goalie | undefined> {
    return new Observable(observer => {
      this.getGoalies().subscribe(data => {
        const goalie = data.goalies.find(g => g.id === id);
        observer.next(goalie);
        observer.complete();
      });
    });
  }

  // Mock methods for future implementation
  deleteGoalie(id: string): Observable<boolean> {
    // Simulate delete operation
    console.log(`Delete goalie with ID: ${id}`);
    return of(true).pipe(delay(300));
  }

  updateGoalie(goalie: Partial<Goalie>): Observable<Goalie> {
    // Simulate update operation
    console.log(`Update goalie:`, goalie);
    return of(goalie as Goalie).pipe(delay(300));
  }
}