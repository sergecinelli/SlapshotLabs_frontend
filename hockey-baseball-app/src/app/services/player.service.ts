import { Injectable, inject } from '@angular/core';
import { Observable, throwError, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Player, PlayerTableData, PlayerApiOut, PlayerApiIn, PlayerApiPatch, PlayerApiInData, PlayerApiOutData } from '../shared/interfaces/player.interface';
import { ApiService } from './api.service';
import { TeamService } from './team.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private apiService = inject(ApiService);
  private teamService = inject(TeamService);

  getPlayers(): Observable<PlayerTableData> {
    return forkJoin({
      players: this.apiService.get<PlayerApiOutData[]>('/hockey/player/list'),
      teams: this.teamService.getTeams()
    }).pipe(
      map(({ players: apiPlayers, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map(t => [parseInt(t.id), t.name]));
        
        // Map players with team names
        const players = apiPlayers.map(apiPlayer => 
          this.fromApiOutFormat({ photo: '', data: apiPlayer }, teamMap.get(apiPlayer.team_id))
        );
        return {
          players: players,
          total: players.length
        };
      }),
      catchError(error => {
        console.error('Failed to fetch players:', error);
        return throwError(() => error);
      })
    );
  }

  getPlayersByTeam(teamId: number): Observable<Player[]> {
    return this.apiService.get<PlayerApiOutData[]>('/hockey/player/list').pipe(
      map(apiPlayers => {
        // Filter by team_id and convert to frontend format
        return apiPlayers
          .filter(apiPlayer => apiPlayer.team_id === teamId)
          .map(apiPlayer => this.fromApiOutFormat({ photo: '', data: apiPlayer }));
      }),
      catchError(error => {
        console.error(`Failed to fetch players for team ${teamId}:`, error);
        return throwError(() => error);
      })
    );
  }

  getPlayerById(id: string): Observable<Player | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    return forkJoin({
      player: this.apiService.get<PlayerApiOutData>(`/hockey/player/${numericId}`),
      teams: this.teamService.getTeams()
    }).pipe(
      map(({ player: apiPlayer, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map(t => [parseInt(t.id), t.name]));
        // Single player endpoint returns flat object without photo wrapper
        return this.fromApiOutFormat({ photo: '', data: apiPlayer }, teamMap.get(apiPlayer.team_id));
      }),
      catchError(error => {
        console.error(`Failed to fetch player with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  deletePlayer(id: string): Observable<boolean> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID for deletion: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    return this.apiService.delete<void>(`/hockey/player/${numericId}`).pipe(
      map(() => {
        console.log(`Player with ID ${id} deleted successfully`);
        return true;
      }),
      catchError(error => {
        console.error(`Failed to delete player with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  addPlayer(playerData: Partial<Player>, photo = ''): Observable<Player> {
    // Extract team ID from playerData or default to 1
    const teamId = (playerData as Record<string, unknown>)['teamId'] as string | undefined;
    const numericTeamId = teamId ? parseInt(teamId, 10) : 1;
    
    // Transform frontend data to API format
    const apiPlayerData = this.toApiInFormat(playerData, numericTeamId, photo);
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Add photo if provided
    if (photo) {
      formData.append('photo', photo);
    }
    
    // Add data as JSON string
    formData.append('data', JSON.stringify(apiPlayerData.data));
    
    return this.apiService.postMultipart<{ id: number }>('/hockey/player', formData).pipe(
      switchMap(response => {
        // Fetch the newly created player to get proper team name mapping
        return this.getPlayerById(response.id.toString());
      }),
      map(newPlayer => {
        if (!newPlayer) {
          throw new Error('Failed to fetch newly created player');
        }
        console.log(`Added new player:`, newPlayer);
        return newPlayer;
      }),
      catchError(error => {
        console.error('Failed to add player:', error);
        return throwError(() => error);
      })
    );
  }

  updatePlayer(id: string, playerData: Partial<Player>, photo?: string): Observable<Player> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID for update: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    const apiUpdateData = this.toApiUpdateFormat(playerData, photo);
    
    return this.apiService.patch<void>(`/hockey/player/${numericId}`, apiUpdateData).pipe(
      switchMap(() => {
        // After successful update, fetch the updated player data
        return this.getPlayerById(id);
      }),
      map(updatedPlayer => {
        if (!updatedPlayer) {
          throw new Error(`Player with ID ${id} not found after update`);
        }
        console.log(`Player with ID ${id} updated successfully`);
        return updatedPlayer;
      }),
      catchError(error => {
        console.error(`Failed to update player with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  private fromApiOutFormat(apiPlayer: PlayerApiOut, teamName?: string): Player {
    const data = apiPlayer.data;
    const heightFeet = Math.floor(data.height / 12);
    const heightInches = data.height % 12;
    const heightString = `${heightFeet}'${heightInches}"`;

    return {
      id: data.id.toString(),
      teamId: data.team_id,  // Store team ID from API
      team: teamName || `Team ${data.team_id}`,
      position: this.mapPositionIdToName(data.position_id),
      height: heightString,
      weight: data.weight,
      shoots: data.shoots === 'R' ? 'Right Shot' : 'Left Shot',
      jerseyNumber: data.number,
      firstName: data.first_name,
      lastName: data.last_name,
      birthYear: this.dateStringToYear(data.birth_year),
      shotsOnGoal: data.shots_on_goal || 0,
      shotSprayChart: '',
      gamesPlayed: data.games_played || 0,
      goals: data.goals || 0,
      assists: data.assists || 0,
      points: data.points || 0,
      scoringChances: data.scoring_chances || 0,
      blockedShots: data.blocked_shots || 0,
      penaltiesDrawn: data.penalties_drawn || 0,
      level: 'Professional',
      rink: {
        facilityName: 'Default Facility',
        rinkName: 'Main Rink',
        city: 'City',
        address: 'Address'
      },
      createdAt: new Date()
    };
  }

  private toApiUpdateFormat(playerData: Partial<Player>, photo?: string): PlayerApiPatch {
    const dataUpdate: Partial<PlayerApiInData> = {};
    
    // Include team_id if provided
    const teamId = (playerData as Record<string, unknown>)['teamId'] as string | undefined;
    if (teamId) {
      const numericTeamId = parseInt(teamId, 10);
      if (!isNaN(numericTeamId)) {
        dataUpdate.team_id = numericTeamId;
      }
    }
    
    // Only include fields that are provided and exist in the API
    if (playerData.height) {
      dataUpdate.height = this.parseHeightToInches(playerData.height);
    }
    if (playerData.weight !== undefined) {
      dataUpdate.weight = playerData.weight;
    }
    if (playerData.shoots) {
      dataUpdate.shoots = playerData.shoots === 'Right Shot' ? 'R' : 'L';
    }
    if (playerData.jerseyNumber !== undefined) {
      dataUpdate.number = playerData.jerseyNumber;  // Changed from jersey_number to number
    }
    if (playerData.firstName) {
      dataUpdate.first_name = playerData.firstName;
    }
    if (playerData.lastName) {
      dataUpdate.last_name = playerData.lastName;
    }
    if (playerData.birthYear) {
      dataUpdate.birth_year = this.yearToDateString(playerData.birthYear);
    }
    if (playerData.position) {
      dataUpdate.position_id = this.mapPositionNameToId(playerData.position);
    }
    if (playerData.penaltiesDrawn !== undefined) {
      dataUpdate.penalties_drawn = playerData.penaltiesDrawn;
    }
    
    const patchData: PlayerApiPatch = {};
    if (Object.keys(dataUpdate).length > 0) {
      patchData.data = dataUpdate;
    }
    if (photo !== undefined) {
      patchData.photo = photo;
    }
    
    return patchData;
  }

  private toApiInFormat(playerData: Partial<Player>, teamId: number, photo = ''): PlayerApiIn {
    const heightInches = this.parseHeightToInches(playerData.height || "6'0\"");
    
    return {
      photo: photo,
      data: {
        team_id: teamId,
        position_id: this.mapPositionNameToId(playerData.position || 'Center'),
        height: heightInches,
        weight: playerData.weight || 180,
        shoots: playerData.shoots === 'Right Shot' ? 'R' : 'L',
        number: playerData.jerseyNumber || 0,
        first_name: playerData.firstName || '',
        last_name: playerData.lastName || '',
        birth_year: this.yearToDateString(playerData.birthYear || new Date().getFullYear() - 25),
        player_bio: (playerData as Record<string, unknown>)['playerBiography'] as string | undefined,
        birthplace_country: (playerData as Record<string, unknown>)['birthplace'] as string | undefined,
        address_country: (playerData as Record<string, unknown>)['addressCountry'] as string | undefined,
        address_region: (playerData as Record<string, unknown>)['addressRegion'] as string | undefined,
        address_city: (playerData as Record<string, unknown>)['addressCity'] as string | undefined,
        address_street: (playerData as Record<string, unknown>)['addressStreet'] as string | undefined,
        address_postal_code: (playerData as Record<string, unknown>)['addressPostalCode'] as string | undefined,
        penalties_drawn: playerData.penaltiesDrawn,
        penalty_minutes: 0,
        faceoffs: 0,
        faceoffs_won: 0,
        turnovers: 0,
        analysis: undefined
      }
    };
  }

  private parseHeightToInches(height: string): number {
    const match = height.match(/(\d+)'(\d+)"/);
    if (match) {
      const feet = parseInt(match[1], 10);
      const inches = parseInt(match[2], 10);
      return feet * 12 + inches;
    }
    return 72; // Default to 6'0"
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

  /**
   * Convert date string to year number
   * @param dateString - Date string in YYYY-MM-DD format
   * @returns Year as number
   */
  private dateStringToYear(dateString: string): number {
    const date = new Date(dateString);
    return date.getFullYear();
  }

  private mapPositionIdToName(positionId: number): 'Left Wing' | 'Center' | 'Right Wing' | 'Left Defense' | 'Right Defense' {
    const positionMap: Record<number, 'Left Wing' | 'Center' | 'Right Wing' | 'Left Defense' | 'Right Defense'> = {
      1: 'Left Wing',
      2: 'Center',
      3: 'Right Wing',
      4: 'Left Defense',
      5: 'Right Defense'
    };
    return positionMap[positionId] || 'Center';
  }

  private mapPositionNameToId(position: string): number {
    const positionMap: Record<string, number> = {
      'Left Wing': 1,
      'Center': 2,
      'Right Wing': 3,
      'Left Defense': 4,
      'Right Defense': 5
    };
    return positionMap[position] || 2;
  }

}
