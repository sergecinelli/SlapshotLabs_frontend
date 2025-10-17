import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Player, PlayerTableData, PlayerApiOut, PlayerApiIn } from '../shared/interfaces/player.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class PlayerService {
  private apiService = inject(ApiService);

  getPlayers(): Observable<PlayerTableData> {
    return this.apiService.get<PlayerApiOut[]>('/hockey/player/list').pipe(
      map(apiPlayers => {
        const players = apiPlayers.map(apiPlayer => this.fromApiOutFormat(apiPlayer));
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

    return this.apiService.get<PlayerApiOut>(`/hockey/player/${numericId}`).pipe(
      map(apiPlayer => this.fromApiOutFormat(apiPlayer)),
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

  addPlayer(playerData: Partial<Player>): Observable<Player> {
    // Transform frontend data to API format
    const apiPlayerData = this.toApiInFormat(playerData, 1); // Default team_id = 1
    
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

  updatePlayer(id: string, playerData: Partial<Player>): Observable<Player> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID for update: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    const apiUpdateData = this.toApiUpdateFormat(playerData);
    
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
    const heightFeet = Math.floor(apiPlayer.height / 12);
    const heightInches = apiPlayer.height % 12;
    const heightString = `${heightFeet}'${heightInches}"`;

    return {
      id: apiPlayer.id.toString(),
      team: `Team ${apiPlayer.team_id}`,
      position: this.mapPositionIdToName(apiPlayer.position_id),
      height: heightString,
      weight: apiPlayer.weight,
      shoots: apiPlayer.shoots === 'R' ? 'Right Shot' : 'Left Shot',
      jerseyNumber: apiPlayer.number,  // Changed from jersey_number to number
      firstName: apiPlayer.first_name,
      lastName: apiPlayer.last_name,
      birthYear: this.dateStringToYear(apiPlayer.birth_year),  // Convert date string to year
      shotsOnGoal: apiPlayer.shots_on_goal,  // Now available in API
      shotSprayChart: '', // Not available in current API schema
      gamesPlayed: apiPlayer.games_played,
      goals: apiPlayer.goals,
      assists: apiPlayer.assists,
      points: apiPlayer.points,
      scoringChances: apiPlayer.scoring_chances,
      blockedShots: apiPlayer.blocked_shots,
      penaltiesDrawn: apiPlayer.penalties_drawn,
      level: 'Professional',
      rink: {
        facilityName: 'Default Facility',
        rinkName: 'Main Rink',
        city: 'City',
        address: 'Address'
      },
      createdAt: new Date() // Set creation date for newly created items
    };
  }

  private toApiUpdateFormat(playerData: Partial<Player>): Partial<PlayerApiIn> {
    const updateData: Partial<PlayerApiIn> = {};
    
    // Only include fields that are provided and exist in the API
    if (playerData.height) {
      updateData.height = this.parseHeightToInches(playerData.height);
    }
    if (playerData.weight !== undefined) {
      updateData.weight = playerData.weight;
    }
    if (playerData.shoots) {
      updateData.shoots = playerData.shoots === 'Right Shot' ? 'R' : 'L';
    }
    if (playerData.jerseyNumber !== undefined) {
      updateData.number = playerData.jerseyNumber;  // Changed from jersey_number to number
    }
    if (playerData.firstName) {
      updateData.first_name = playerData.firstName;
    }
    if (playerData.lastName) {
      updateData.last_name = playerData.lastName;
    }
    if (playerData.birthYear) {
      updateData.birth_year = this.yearToDateString(playerData.birthYear);
    }
    if (playerData.position) {
      updateData.position_id = this.mapPositionNameToId(playerData.position);
    }
    if (playerData.goals !== undefined) {
      updateData.goals = playerData.goals;
    }
    if (playerData.assists !== undefined) {
      updateData.assists = playerData.assists;
    }
    if (playerData.points !== undefined) {
      updateData.points = playerData.points;
    }
    if (playerData.scoringChances !== undefined) {
      updateData.scoring_chances = playerData.scoringChances;
    }
    if (playerData.blockedShots !== undefined) {
      updateData.blocked_shots = playerData.blockedShots;
    }
    if (playerData.penaltiesDrawn !== undefined) {
      updateData.penalties_drawn = playerData.penaltiesDrawn;
    }
    
    return updateData;
  }

  private toApiInFormat(playerData: Partial<Player>, teamId: number): PlayerApiIn {
    const heightInches = this.parseHeightToInches(playerData.height || "6'0\"");
    
    return {
      team_id: teamId,
      position_id: this.mapPositionNameToId(playerData.position || 'Center'),
      height: heightInches,
      weight: playerData.weight || 180,
      shoots: playerData.shoots === 'Right Shot' ? 'R' : 'L',
      number: playerData.jerseyNumber || 0,  // Changed from jersey_number to number
      first_name: playerData.firstName || '',
      last_name: playerData.lastName || '',
      birth_year: this.yearToDateString(playerData.birthYear || new Date().getFullYear() - 25),
      goals: playerData.goals || 0,
      assists: playerData.assists || 0,
      points: playerData.points || 0,
      scoring_chances: playerData.scoringChances || 0,
      blocked_shots: playerData.blockedShots || 0,
      penalties_drawn: playerData.penaltiesDrawn || 0
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