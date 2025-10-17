import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TeamLevel, Division } from '../shared/interfaces/team-level.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TeamOptionsService {
  private apiService = inject(ApiService);
  private levelMap = new Map<string, number>();
  private divisionMap = new Map<string, number>();
  private levelIdMap = new Map<number, string>();
  private divisionIdMap = new Map<number, string>();

  /**
   * Fetch all team levels from the API
   */
  getTeamLevels(): Observable<TeamLevel[]> {
    return this.apiService.get<TeamLevel[]>('/hockey/team-level/list').pipe(
      map(levels => {
        // Populate mapping for data transformation
        levels.forEach(level => {
          this.levelMap.set(level.name, level.id);
          this.levelIdMap.set(level.id, level.name);
        });
        return levels;
      }),
      catchError(error => {
        console.error('Failed to fetch team levels:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fetch all divisions from the API
   */
  getDivisions(): Observable<Division[]> {
    return this.apiService.get<Division[]>('/hockey/division/list').pipe(
      map(divisions => {
        // Populate mapping for data transformation
        divisions.forEach(division => {
          this.divisionMap.set(division.name, division.id);
          this.divisionIdMap.set(division.id, division.name);
        });
        return divisions;
      }),
      catchError(error => {
        console.error('Failed to fetch divisions:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate group options (1U through 22U)
   */
  getGroupOptions(): { value: string; label: string }[] {
    const groups = [];
    
    // Add 1U
    groups.push({ value: '1U', label: '1U' });
    
    // Add 5U through 22U
    for (let i = 5; i <= 22; i++) {
      groups.push({ value: `${i}U`, label: `${i}U` });
    }
    
    return groups;
  }

  /**
   * Transform team levels to dropdown options
   */
  transformLevelsToOptions(levels: TeamLevel[]): { value: string; label: string }[] {
    return levels.map(level => ({
      value: level.name,
      label: level.name
    }));
  }

  /**
   * Transform divisions to dropdown options
   */
  transformDivisionsToOptions(divisions: Division[]): { value: string; label: string }[] {
    return divisions.map(division => ({
      value: division.name,
      label: division.name
    }));
  }

  /**
   * Map level name to ID
   */
  getLevelId(levelName: string): number {
    return this.levelMap.get(levelName) || 1;
  }

  /**
   * Map level ID to name
   */
  getLevelName(levelId: number): string {
    return this.levelIdMap.get(levelId) || 'NHL';
  }

  /**
   * Map division name to ID
   */
  getDivisionId(divisionName: string): number {
    return this.divisionMap.get(divisionName) || 1;
  }

  /**
   * Map division ID to name
   */
  getDivisionName(divisionId: number): string {
    return this.divisionIdMap.get(divisionId) || 'Atlantic';
  }
}
