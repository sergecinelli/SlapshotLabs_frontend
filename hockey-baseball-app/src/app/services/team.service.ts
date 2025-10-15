import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Team, TeamTableData, TeamApiOut, TeamApiIn } from '../shared/interfaces/team.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly mockDataPath = '/assets/data/teams-mock.json';

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  getTeams(): Observable<TeamTableData> {
    return this.apiService.get<TeamApiOut[]>('/hockey/team/list').pipe(
      switchMap(apiTeams => {
        const teams = apiTeams.map(apiTeam => this.fromApiOutFormat(apiTeam));
        
        // If API returns empty list, use mock data
        if (teams.length === 0) {
          console.log('API returned empty teams list, falling back to mock data');
          return this.http.get<TeamTableData>(this.mockDataPath).pipe(
            delay(500)
          );
        }
        
        return of({
          teams: teams,
          total: teams.length
        });
      }),
      catchError(error => {
        console.error('Failed to fetch teams:', error);
        // Fallback to mock data if API fails
        return this.http.get<TeamTableData>(this.mockDataPath).pipe(
          delay(500)
        );
      })
    );
  }

  getTeamById(id: string): Observable<Team | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      // If ID is not numeric, fall back to filtering mock data
      return new Observable<Team | undefined>(observer => {
        this.getTeams().subscribe(data => {
          const team = data.teams.find(t => t.id === id);
          observer.next(team);
          observer.complete();
        });
      });
    }

    return this.apiService.get<TeamApiOut>(`/hockey/team/${numericId}`).pipe(
      map(apiTeam => this.fromApiOutFormat(apiTeam)),
      catchError(error => {
        console.error(`Failed to fetch team with ID ${id}:`, error);
        // Fallback to mock data search
        return new Observable<Team | undefined>(observer => {
          this.getTeams().subscribe(data => {
            const team = data.teams.find(t => t.id === id);
            observer.next(team);
            observer.complete();
          });
        });
      })
    );
  }

  deleteTeam(id: string): Observable<boolean> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid team ID for deletion: ${id}`);
      return of(false);
    }

    return this.apiService.delete<void>(`/hockey/team/${numericId}`).pipe(
      map(() => {
        console.log(`Team with ID ${id} deleted successfully`);
        return true;
      }),
      catchError(error => {
        console.error(`Failed to delete team with ID ${id}:`, error);
        return of(false);
      })
    );
  }

  addTeam(teamData: Partial<Team>): Observable<Team> {
    // Transform frontend data to API format
    const apiTeamData = this.toApiInFormat(teamData);
    
    return this.apiService.post<{ id: number }>('/hockey/team', apiTeamData).pipe(
      map(response => {
        // Create a complete team object with the returned ID
        const newTeam: Team = {
          id: response.id.toString(),
          ...teamData,
          // Ensure all required fields are present
          name: teamData.name || 'New Team',
          logo: teamData.logo || '/assets/icons/teams.svg',
          level: teamData.level || 'NHL',
          division: teamData.division || 'Atlantic',
          wins: teamData.wins || 0,
          losses: teamData.losses || 0,
          goalsFor: teamData.goalsFor || 0,
          goalsAgainst: teamData.goalsAgainst || 0,
          points: teamData.points || 0,
          gamesPlayed: teamData.gamesPlayed || 0
        } as Team;
        
        console.log(`Added new team:`, newTeam);
        return newTeam;
      }),
      catchError(error => {
        console.error('Failed to add team:', error);
        // Fallback to mock behavior
        const newTeam: Team = {
          id: 'team-' + Date.now().toString(),
          ...teamData
        } as Team;
        return of(newTeam).pipe(delay(300));
      })
    );
  }

  updateTeam(id: string, teamData: Partial<Team>): Observable<Team> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid team ID for update: ${id}`);
      return throwError(() => new Error(`Invalid team ID: ${id}`));
    }

    const apiUpdateData = this.toApiUpdateFormat(teamData);
    
    return this.apiService.put<void>(`/hockey/team/${numericId}`, apiUpdateData).pipe(
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
        // Fallback to mock behavior
        const updatedTeam: Team = {
          id,
          ...teamData
        } as Team;
        return of(updatedTeam);
      })
    );
  }

  private fromApiOutFormat(apiTeam: TeamApiOut): Team {
    return {
      id: apiTeam.id.toString(),
      name: apiTeam.name,
      logo: apiTeam.logo,
      level: this.mapTeamLevelIdToName(apiTeam.team_level_id),
      division: this.mapDivisionIdToName(apiTeam.division_id),
      wins: apiTeam.wins,
      losses: apiTeam.losses,
      goalsFor: apiTeam.goals_for,
      goalsAgainst: apiTeam.goals_against,
      points: apiTeam.points,
      gamesPlayed: apiTeam.games_played
    };
  }

  private toApiUpdateFormat(teamData: Partial<Team>): Partial<TeamApiIn> {
    const updateData: Partial<TeamApiIn> = {};
    
    // Only include fields that are provided and exist in the API
    if (teamData.name) {
      updateData.name = teamData.name;
    }
    if (teamData.logo) {
      updateData.logo = teamData.logo;
    }
    if (teamData.level) {
      updateData.team_level_id = this.mapTeamLevelNameToId(teamData.level);
    }
    if (teamData.division) {
      updateData.division_id = this.mapDivisionNameToId(teamData.division);
    }
    if (teamData.wins !== undefined) {
      updateData.wins = teamData.wins;
    }
    if (teamData.losses !== undefined) {
      updateData.losses = teamData.losses;
    }
    if (teamData.goalsFor !== undefined) {
      updateData.goals_for = teamData.goalsFor;
    }
    if (teamData.goalsAgainst !== undefined) {
      updateData.goals_against = teamData.goalsAgainst;
    }
    if (teamData.points !== undefined) {
      updateData.points = teamData.points;
    }
    if (teamData.gamesPlayed !== undefined) {
      updateData.games_played = teamData.gamesPlayed;
    }
    
    return updateData;
  }

  private toApiInFormat(teamData: Partial<Team>): TeamApiIn {
    return {
      name: teamData.name || 'New Team',
      logo: teamData.logo || '/assets/icons/teams.svg',
      team_level_id: this.mapTeamLevelNameToId(teamData.level || 'NHL'),
      division_id: this.mapDivisionNameToId(teamData.division || 'Atlantic'),
      wins: teamData.wins || 0,
      losses: teamData.losses || 0,
      goals_for: teamData.goalsFor || 0,
      goals_against: teamData.goalsAgainst || 0,
      points: teamData.points || 0,
      games_played: teamData.gamesPlayed || 0
    };
  }

  private mapTeamLevelIdToName(teamLevelId: number): string {
    const levelMap: { [key: number]: string } = {
      1: 'NHL',
      2: 'AHL',
      3: 'Junior A',
      4: 'Junior B',
      5: 'Junior C'
    };
    return levelMap[teamLevelId] || 'NHL';
  }

  private mapTeamLevelNameToId(level: string): number {
    const levelMap: { [key: string]: number } = {
      'NHL': 1,
      'AHL': 2,
      'Junior A': 3,
      'Junior B': 4,
      'Junior C': 5
    };
    return levelMap[level] || 1;
  }

  private mapDivisionIdToName(divisionId: number): string {
    const divisionMap: { [key: number]: string } = {
      1: 'Atlantic',
      2: 'Metropolitan',
      3: 'Central',
      4: 'Pacific'
    };
    return divisionMap[divisionId] || 'Atlantic';
  }

  private mapDivisionNameToId(division: string): number {
    const divisionMap: { [key: string]: number } = {
      'Atlantic': 1,
      'Metropolitan': 2,
      'Central': 3,
      'Pacific': 4
    };
    return divisionMap[division] || 1;
  }
}
