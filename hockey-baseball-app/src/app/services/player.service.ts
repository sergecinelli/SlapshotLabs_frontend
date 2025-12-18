import { Injectable, inject } from '@angular/core';
import { Observable, throwError, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  Player,
  PlayerTableData,
  PlayerApiOut,
  PlayerApiIn,
  PlayerApiPatch,
  PlayerApiInData,
  PlayerApiOutData,
  PlayerTeamSeasonApiOut,
  PlayerSeasonStats,
  GamePlayerOut,
  PlayerRecentGameStats,
} from '../shared/interfaces/player.interface';
import { ApiService } from './api.service';
import { TeamService } from './team.service';
import { SprayChartFilter, SprayChartEvent } from '../shared/interfaces/spray-chart.interface';
import { formatDateShort } from '../shared/utils/time-converter.util';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private apiService = inject(ApiService);
  private teamService = inject(TeamService);

  getPlayers(): Observable<PlayerTableData> {
    return forkJoin({
      players: this.apiService.get<PlayerApiOutData[]>('/hockey/player/list'),
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ players: apiPlayers, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map((t) => [parseInt(t.id), t.name]));

        // Map players with team names
        const players = apiPlayers.map((apiPlayer) =>
          this.fromApiOutFormat({ photo: '', data: apiPlayer }, teamMap.get(apiPlayer.team_id))
        );
        return {
          players: players,
          total: players.length,
        };
      }),
      catchError((error) => {
        console.error('Failed to fetch players:', error);
        return throwError(() => error);
      })
    );
  }

  getPlayersByTeam(teamId: number): Observable<Player[]> {
    return this.apiService.get<PlayerApiOutData[]>(`/hockey/player/list?team_id=${teamId}`).pipe(
      map((apiPlayers) => {
        // Convert to frontend format
        return apiPlayers.map((apiPlayer) => this.fromApiOutFormat({ photo: '', data: apiPlayer }));
      }),
      catchError((error) => {
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
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ player: apiPlayer, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map((t) => [parseInt(t.id), t.name]));
        // Single player endpoint returns flat object without photo wrapper
        return this.fromApiOutFormat(
          { photo: '', data: apiPlayer },
          teamMap.get(apiPlayer.team_id)
        );
      }),
      catchError((error) => {
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
        return true;
      }),
      catchError((error) => {
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
      switchMap((response) => {
        // Fetch the newly created player to get proper team name mapping
        return this.getPlayerById(response.id.toString());
      }),
      map((newPlayer) => {
        if (!newPlayer) {
          throw new Error('Failed to fetch newly created player');
        }
        return newPlayer;
      }),
      catchError((error) => {
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

    // Create FormData for multipart/form-data request
    const formData = new FormData();

    // Add photo if provided
    if (photo !== undefined) {
      formData.append('photo', photo);
    }

    // Add data as JSON string if there are data updates
    if (apiUpdateData.data && Object.keys(apiUpdateData.data).length > 0) {
      formData.append('data', JSON.stringify(apiUpdateData.data));
    }

    return this.apiService.patchMultipart<void>(`/hockey/player/${numericId}`, formData).pipe(
      switchMap(() => {
        // After successful update, fetch the updated player data
        return this.getPlayerById(id);
      }),
      map((updatedPlayer) => {
        if (!updatedPlayer) {
          throw new Error(`Player with ID ${id} not found after update`);
        }
        return updatedPlayer;
      }),
      catchError((error) => {
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
      teamId: data.team_id, // Store team ID from API
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
      penaltyMinutes: data.penalty_minutes || 0,
      turnovers: data.turnovers || 0,
      faceoffWinPercents: data.faceoff_win_percents || 0,
      shortHandedGoals: data.short_handed_goals || 0,
      powerPlayGoals: data.power_play_goals || 0,
      level: 'Professional',
      rink: {
        facilityName: 'Default Facility',
        rinkName: 'Main Rink',
        city: 'City',
        address: 'Address',
      },
      createdAt: new Date(),
      // Add new fields from API
      playerBiography: data.player_bio || '',
      birthplace: data.birthplace_country || '',
      addressCountry: data.address_country || '',
      addressRegion: data.address_region || '',
      addressCity: data.address_city || '',
      addressStreet: data.address_street || '',
      addressPostalCode: data.address_postal_code || '',
      analysis: data.analysis || '',
    } as Player & Record<string, unknown>;
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
      if (typeof playerData.height === 'string') {
        dataUpdate.height = this.parseHeightToInches(playerData.height);
      } else if (typeof playerData.height === 'number') {
        dataUpdate.height = playerData.height;
      }
    }
    if (playerData.weight !== undefined) {
      dataUpdate.weight = playerData.weight;
    }
    if (playerData.shoots) {
      dataUpdate.shoots = playerData.shoots === 'Right Shot' ? 'R' : 'L';
    }
    if (playerData.jerseyNumber !== undefined) {
      dataUpdate.number = playerData.jerseyNumber; // Changed from jersey_number to number
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

    const extendedData = playerData as Record<string, unknown>;

    if (extendedData['playerBiography'] !== undefined) {
      dataUpdate.player_bio = extendedData['playerBiography'] as string | undefined;
    }
    if (extendedData['birthplace'] !== undefined) {
      dataUpdate.birthplace_country = extendedData['birthplace'] as string | undefined;
    }
    if (extendedData['addressCountry'] !== undefined) {
      dataUpdate.address_country = extendedData['addressCountry'] as string | undefined;
    }
    if (extendedData['addressRegion'] !== undefined) {
      dataUpdate.address_region = extendedData['addressRegion'] as string | undefined;
    }
    if (extendedData['addressCity'] !== undefined) {
      dataUpdate.address_city = extendedData['addressCity'] as string | undefined;
    }
    if (extendedData['addressStreet'] !== undefined) {
      dataUpdate.address_street = extendedData['addressStreet'] as string | undefined;
    }
    if (extendedData['addressPostalCode'] !== undefined) {
      dataUpdate.address_postal_code = extendedData['addressPostalCode'] as string | undefined;
    }
    if (extendedData['analysis'] !== undefined) {
      dataUpdate.analysis = extendedData['analysis'] as string | undefined;
    }

    const patchData: PlayerApiPatch = {};
    if (Object.keys(dataUpdate).length > 0) {
      patchData.data = dataUpdate;
      console.log(patchData);
    }
    if (photo !== undefined) {
      patchData.photo = photo;
    }

    return patchData;
  }

  private toApiInFormat(playerData: Partial<Player>, teamId: number, photo = ''): PlayerApiIn {
    // Handle height - could be string like "6'0\"" or number (inches)
    let heightInches: number;
    if (typeof playerData.height === 'string') {
      heightInches = this.parseHeightToInches(playerData.height);
    } else if (typeof playerData.height === 'number') {
      heightInches = playerData.height;
    } else {
      heightInches = 72; // Default 6'0"
    }

    const extendedData = playerData as Record<string, unknown>;

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
        player_bio: (extendedData['playerBiography'] as string) || '',
        birthplace_country: (extendedData['birthplace'] as string) || '',
        address_country: (extendedData['addressCountry'] as string) || '',
        address_region: (extendedData['addressRegion'] as string) || '',
        address_city: (extendedData['addressCity'] as string) || '',
        address_street: (extendedData['addressStreet'] as string) || '',
        address_postal_code: (extendedData['addressPostalCode'] as string) || '',
        penalties_drawn: playerData.penaltiesDrawn,
        analysis: (extendedData['analysis'] as string) || '',
      },
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
    return `${year}-02-01`;
  }

  /**
   * Convert date string to year number
   * @param dateString - Date string in YYYY-MM-DD format
   * @returns Year as number
   */
  private dateStringToYear(dateString: string): number {
    const date = new Date(dateString);
    return date.getUTCFullYear();
  }

  private mapPositionIdToName(
    positionId: number
  ): 'Left Wing' | 'Center' | 'Right Wing' | 'Left Defense' | 'Right Defense' | 'Goalie' {
    const positionMap: Record<
      number,
      'Left Wing' | 'Center' | 'Right Wing' | 'Left Defense' | 'Right Defense' | 'Goalie'
    > = {
      1: 'Left Wing',
      2: 'Center',
      3: 'Right Wing',
      4: 'Left Defense',
      5: 'Right Defense',
      6: 'Goalie',
    };
    return positionMap[positionId] || 'Center';
  }

  getPlayerSprayChart(id: string, filter: SprayChartFilter = {}): Observable<SprayChartEvent[]> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    return this.apiService
      .post<SprayChartEvent[]>(`/hockey/player/${numericId}/spray-chart`, filter)
      .pipe(
        catchError((error) => {
          console.error(`Failed to fetch spray chart for player ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  getPlayerTeamSeasons(id: string): Observable<PlayerSeasonStats[]> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    return forkJoin({
      teamSeasons: this.apiService.get<PlayerTeamSeasonApiOut[]>(
        `/hockey/player/${numericId}/team-seasons`
      ),
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ teamSeasons, teams }) => {
        // Create team ID to name and logo mapping
        const teamMap = new Map(
          teams.teams.map((t) => [parseInt(t.id), { name: t.name, logo: t.logo || '' }])
        );

        // Map API response to frontend format
        return teamSeasons.map((season) => {
          const teamInfo = teamMap.get(season.team_id) || {
            name: `Team ${season.team_id}`,
            logo: '',
          };

          return {
            season: '', // Will be filled from seasons list by seasonId
            seasonId: season.season_id,
            logo: teamInfo.logo,
            team: teamInfo.name,
            gamesPlayed: season.games_played,
            goals: season.goals,
            assists: season.assists,
            points: season.points,
            shotsOnGoal: season.shots_on_goal,
            scoringChances: season.scoring_chances,
            penaltiesDrawn: this.parsePenaltyDuration(season.penalties_drawn),
            turnovers: season.turnovers,
            faceOffWinPercentage: season.faceoff_win_percents,
          };
        });
      }),
      catchError((error) => {
        console.error(`Failed to fetch team seasons for player ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  getPlayerRecentGames(id: string, limit = 5): Observable<PlayerRecentGameStats[]> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid player ID: ${id}`);
      return throwError(() => new Error(`Invalid player ID: ${id}`));
    }

    return forkJoin({
      games: this.apiService.get<GamePlayerOut[]>(
        `/hockey/game-player/player/${numericId}?limit=${limit}`
      ),
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ games, teams }) => {
        // Create team ID to name and logo mapping
        const teamMap = new Map(
          teams.teams.map((t) => [parseInt(t.id), { name: t.name, logo: t.logo || '' }])
        );

        // Map API response to frontend format
        return games.map((game) => {
          // Get opponent team info by team_vs_id
          const vsTeamInfo = teamMap.get(game.team_vs_id) || {
            name: game.team_vs_name,
            logo: '',
          };

          // Get player's team info by team_id
          const playerTeamInfo = teamMap.get(game.team_id) || {
            name: game.team_name,
            logo: '',
          };

          // Format date
          const formattedDate = formatDateShort(game.date);

          // faceoff_win_percents is already in percentage format (0-100)
          const faceOffWinPercentage = game.faceoff_win_percents || 0;

          // Get base URL for logo endpoint
          const baseUrl = this.apiService.getBaseUrl();
          const vsTeamLogoUrl = `${baseUrl}/hockey/team/${game.team_vs_id}/logo`;

          return {
            season: game.season_name || '',
            date: formattedDate,
            vsTeamName: vsTeamInfo.name, // Opponent team name
            vsTeamLogo: vsTeamLogoUrl, // Logo URL from API endpoint
            teamName: playerTeamInfo.name, // Player's team name
            teamLogo: playerTeamInfo.logo, // Player's team name
            score: game.score,
            goals: game.goals,
            assists: game.assists,
            points: game.points,
            shotsOnGoal: game.shots_on_goal,
            scoringChances: game.scoring_chances,
            penaltiesDrawn: this.parsePenaltyDuration(game.penalty_minutes),
            turnovers: game.turnovers,
            faceOffWinPercentage: faceOffWinPercentage,
          };
        });
      }),
      catchError((error) => {
        console.error(`Failed to fetch recent games for player ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Parse penalty duration string (e.g., "00:05:00") to number of minutes
   */
  private parsePenaltyDuration(duration: string): number {
    if (!duration) return 0;
    // Format is typically "HH:MM:SS" or "MM:SS"
    const parts = duration.split(':');
    if (parts.length === 3) {
      // HH:MM:SS format
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 2) {
      // MM:SS format
      return parseInt(parts[0], 10);
    }
    return 0;
  }

  private mapPositionNameToId(position: string): number {
    const positionMap: Record<string, number> = {
      'Left Wing': 1,
      Center: 2,
      'Right Wing': 3,
      'Left Defense': 4,
      'Right Defense': 5,
      Goalie: 6,
    };
    return positionMap[position] || 2;
  }
}
