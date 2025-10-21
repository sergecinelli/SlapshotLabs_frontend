import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Player, PlayerTableData, PlayerApiOut, PlayerApiIn, PlayerApiPatch, PlayerApiInData, PlayerApiOutData } from '../shared/interfaces/player.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private apiService = inject(ApiService);

  getPlayers(): Observable<PlayerTableData> {
    return this.apiService.get<PlayerApiOutData[]>('/hockey/player/list').pipe(
      map(apiPlayers => {
        // /list endpoint returns flat objects without photo wrapper
        const players = apiPlayers.map(apiPlayer => 
          this.fromApiOutFormat({ photo: '', data: apiPlayer })
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

  getPlayerById(id: string): Observable<Player | undefined> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    return this.apiService.get<PlayerApiOutData>(`/hockey/player/${numericId}`).pipe(
      map(apiPlayer => {
        // Single player endpoint returns flat object without photo wrapper
        return this.fromApiOutFormat({ photo: '', data: apiPlayer });
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
    // Transform frontend data to API format with photo wrapper
    const apiPlayerData = this.toApiInFormat(playerData, 1, photo); // Default team_id = 1
    
    return this.apiService.post<{ id: number }>('/hockey/player', apiPlayerData).pipe(
      map(response => {
        // Create a complete player object with the returned ID
        const newPlayer: Player = {
          id: response.id.toString(),
          ...playerData,
          // Ensure all required fields are present
          team: playerData.team || 'Team 1',
          level: playerData.level || 'Professional',
          position: playerData.position || 'Center',
          rink: playerData.rink || {
            facilityName: 'Default Facility',
            rinkName: 'Main Rink',
            city: 'City',
            address: 'Address'
          },
          createdAt: new Date() // Set creation date
        } as Player;
        
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

  private fromApiOutFormat(apiPlayer: PlayerApiOut): Player {
    const data = apiPlayer.data;
    const heightFeet = Math.floor(data.height / 12);
    const heightInches = data.height % 12;
    const heightString = `${heightFeet}'${heightInches}"`;

    return {
      id: data.id.toString(),
      team: `Team ${data.team_id}`,
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
        birthplace_country: (playerData as Record<string, unknown>)['country'] as string | undefined,
        birthplace_region: this.extractRegion((playerData as Record<string, unknown>)['birthplace'] as string | undefined),
        birthplace_city: this.extractCity((playerData as Record<string, unknown>)['birthplace'] as string | undefined),
        address_country: (playerData as Record<string, unknown>)['country'] as string | undefined,
        address_region: this.extractRegion((playerData as Record<string, unknown>)['address'] as string | undefined),
        address_city: this.extractCity((playerData as Record<string, unknown>)['address'] as string | undefined),
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

  /**
   * Combine location parts into a single string
   */
  private combineLocation(city?: string, region?: string, country?: string): string {
    const parts = [city, region, country].filter(p => p && p.trim());
    return parts.join(', ');
  }

  /**
   * Extract city from location string
   */
  private extractCity(location?: string): string | undefined {
    if (!location) return undefined;
    const parts = location.split(',').map(p => p.trim());
    return parts[0] || undefined;
  }

  /**
   * Extract region from location string
   */
  private extractRegion(location?: string): string | undefined {
    if (!location) return undefined;
    const parts = location.split(',').map(p => p.trim());
    return parts[1] || undefined;
  }
}
