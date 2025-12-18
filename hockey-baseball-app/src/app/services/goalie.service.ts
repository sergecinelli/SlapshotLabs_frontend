import { Injectable, inject } from '@angular/core';
import { Observable, throwError, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  Goalie,
  GoalieTableData,
  GoalieApiInData,
  GoalieApiOutData,
  GoalieTeamSeasonApiOut,
  GoalieSeasonStats,
  GameGoalieOut,
  GoalieRecentGameStats,
} from '../shared/interfaces/goalie.interface';
import { ApiService } from './api.service';
import { GoalieDataMapper } from '../shared/utils/goalie-data-mapper';
import { TeamService } from './team.service';
import { isDefaultGoalieName } from '../shared/constants/goalie.constants';
import { SprayChartFilter, SprayChartEvent } from '../shared/interfaces/spray-chart.interface';
import { formatDateShort } from '../shared/utils/time-converter.util';

export interface GetGoaliesOptions {
  excludeDefault?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class GoalieService {
  private apiService = inject(ApiService);
  private teamService = inject(TeamService);

  getGoalies(options?: GetGoaliesOptions): Observable<GoalieTableData> {
    return forkJoin({
      goalies: this.apiService.get<GoalieApiOutData[]>('/hockey/goalie/list'),
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ goalies: apiGoalies, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map((t) => [parseInt(t.id), t.name]));

        // Map goalies with team names
        let mapped = apiGoalies.map((apiGoalie) =>
          GoalieDataMapper.fromApiOutFormat(
            { photo: '', data: apiGoalie },
            teamMap.get(apiGoalie.team_id)
          )
        );

        if (options?.excludeDefault) {
          mapped = mapped.filter((g) => !isDefaultGoalieName(g.firstName, g.lastName));
        }

        return {
          goalies: mapped,
          total: mapped.length,
        };
      }),
      catchError((error) => {
        console.error('Failed to fetch goalies:', error);
        return throwError(() => error);
      })
    );
  }

  getGoaliesByTeam(teamId: number, options?: GetGoaliesOptions): Observable<Goalie[]> {
    return this.apiService.get<GoalieApiOutData[]>(`/hockey/goalie/list?team_id=${teamId}`).pipe(
      map((apiGoalies) => {
        // Map goalies to frontend format
        let goalies = apiGoalies.map((apiGoalie) =>
          GoalieDataMapper.fromApiOutFormat({ photo: '', data: apiGoalie })
        );
        if (options?.excludeDefault) {
          goalies = goalies.filter((g) => !isDefaultGoalieName(g.firstName, g.lastName));
        }
        return goalies;
      }),
      catchError((error) => {
        console.error(`Failed to fetch goalies for team ${teamId}:`, error);
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

    return forkJoin({
      goalie: this.apiService.get<GoalieApiOutData>(`/hockey/goalie/${numericId}`),
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ goalie: apiGoalie, teams }) => {
        // Create team ID to name mapping
        const teamMap = new Map(teams.teams.map((t) => [parseInt(t.id), t.name]));
        // Single goalie endpoint returns flat object without photo wrapper
        return GoalieDataMapper.fromApiOutFormat(
          { photo: '', data: apiGoalie },
          teamMap.get(apiGoalie.team_id)
        );
      }),
      catchError((error) => {
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
        return true;
      }),
      catchError((error) => {
        console.error(`Failed to delete goalie with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  addGoalie(goalieData: Partial<Goalie>, photo = ''): Observable<Goalie> {
    // Extract team ID from goalieData or default to 1
    const teamId = (goalieData as Record<string, unknown>)['teamId'] as string | undefined;
    const numericTeamId = teamId ? parseInt(teamId, 10) : 1;

    // Transform frontend data to API format
    const apiGoalieData = GoalieDataMapper.toApiInFormat(goalieData, numericTeamId, photo);

    // Create FormData for multipart/form-data request
    const formData = new FormData();

    // Add photo if provided
    if (photo) {
      formData.append('photo', photo);
    }

    // Add data as JSON string
    formData.append('data', JSON.stringify(apiGoalieData.data));

    return this.apiService.postMultipart<{ id: number }>('/hockey/goalie', formData).pipe(
      switchMap((response) => {
        // Fetch the newly created goalie to get proper team name mapping
        return this.getGoalieById(response.id.toString());
      }),
      map((newGoalie) => {
        if (!newGoalie) {
          throw new Error('Failed to fetch newly created goalie');
        }
        return newGoalie;
      }),
      catchError((error) => {
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

    // Extract team ID from goalieData
    const teamId = (goalieData as Record<string, unknown>)['teamId'] as string | undefined;
    const numericTeamId = teamId ? parseInt(teamId, 10) : 1;

    // Transform frontend data to API format
    const apiUpdateData = this.toApiPatchFormat(goalieData, numericTeamId);

    // Create FormData for multipart/form-data request
    const formData = new FormData();

    // Add photo if provided
    if (photo) {
      formData.append('photo', photo);
    }

    // Add data as JSON string
    formData.append('data', JSON.stringify(apiUpdateData));

    return this.apiService.patchMultipart<void>(`/hockey/goalie/${numericId}`, formData).pipe(
      switchMap(() => {
        // After successful update, fetch the updated goalie data
        return this.getGoalieById(id);
      }),
      map((updatedGoalie) => {
        if (!updatedGoalie) {
          throw new Error(`Goalie with ID ${id} not found after update`);
        }
        return updatedGoalie;
      }),
      catchError((error) => {
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
    // Use February 1st of the given year
    return `${year}-02-01`;
  }

  getGoalieSprayChart(id: string, filter: SprayChartFilter = {}): Observable<SprayChartEvent[]> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    return this.apiService
      .post<SprayChartEvent[]>(`/hockey/goalie/${numericId}/spray-chart`, filter)
      .pipe(
        catchError((error) => {
          console.error(`Failed to fetch spray chart for goalie ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  getGoalieTeamSeasons(id: string): Observable<GoalieSeasonStats[]> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    return forkJoin({
      teamSeasons: this.apiService.get<GoalieTeamSeasonApiOut[]>(
        `/hockey/goalie/${numericId}/team-seasons`
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
            wins: season.wins,
            losses: season.losses,
            ties: season.ties,
            goalsAgainst: season.goals_against,
            shotsAgainst: season.shots_on_goal,
            saves: season.saves,
            savePercentage: season.save_percents,
          };
        });
      }),
      catchError((error) => {
        console.error(`Failed to fetch team seasons for goalie ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  private toApiPatchFormat(goalieData: Partial<Goalie>, teamId: number): GoalieApiInData {
    // Include all fields for PATCH (backend expects full data object)
    return {
      team_id: teamId,
      height: goalieData.height ? GoalieDataMapper.heightStringToInches(goalieData.height) : 0,
      weight: goalieData.weight ?? 0,
      shoots: goalieData.shoots ? GoalieDataMapper.shootsToApiFormat(goalieData.shoots) : 'R',
      number: goalieData.jerseyNumber ?? 0,
      first_name: goalieData.firstName ?? '',
      last_name: goalieData.lastName ?? '',
      birth_year: goalieData.birthYear
        ? this.yearToDateString(goalieData.birthYear)
        : this.yearToDateString(new Date().getUTCFullYear()),
      player_bio: goalieData.playerBiography,
      birthplace_country: (goalieData as Record<string, unknown>)['birthplace'] as
        | string
        | undefined,
      address_country: (goalieData as Record<string, unknown>)['addressCountry'] as
        | string
        | undefined,
      address_region: (goalieData as Record<string, unknown>)['addressRegion'] as
        | string
        | undefined,
      address_city: (goalieData as Record<string, unknown>)['addressCity'] as string | undefined,
      address_street: (goalieData as Record<string, unknown>)['addressStreet'] as
        | string
        | undefined,
      address_postal_code: (goalieData as Record<string, unknown>)['addressPostalCode'] as
        | string
        | undefined,
      analysis: (goalieData as Record<string, unknown>)['analysis'] as string | undefined,
    };
  }

  getGoalieRecentGames(id: string, limit = 5): Observable<GoalieRecentGameStats[]> {
    // Convert string ID to number for API call
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      console.error(`Invalid goalie ID: ${id}`);
      return throwError(() => new Error(`Invalid goalie ID: ${id}`));
    }

    return forkJoin({
      games: this.apiService.get<GameGoalieOut[]>(
        `/hockey/game-player/goalie/${numericId}?limit=${limit}`
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

          // Get goalie's team info by team_id
          const goalieTeamInfo = teamMap.get(game.team_id) || {
            name: game.team_name,
            logo: '',
          };

          // Format date
          const formattedDate = formatDateShort(game.date);

          // save_percents is already in percentage format (0-100), convert to decimal (0-1)
          const savePercentage = game.save_percents !== null && game.save_percents !== undefined && !isNaN(game.save_percents)
            ? game.save_percents / 100
            : game.shots_against > 0
              ? game.saves / game.shots_against
              : 0;

          // Get base URL for logo endpoint
          const baseUrl = this.apiService.getBaseUrl();
          const vsTeamLogoUrl = `${baseUrl}/hockey/team/${game.team_vs_id}/logo`;

          return {
            season: game.season_name || '',
            date: formattedDate,
            vsTeamName: vsTeamInfo.name, // Opponent team name
            vsTeamLogo: vsTeamLogoUrl, // Logo URL from API endpoint
            teamName: goalieTeamInfo.name, // Goalie's team name
            score: game.score,
            goalsAgainst: game.goals_against,
            shotsAgainst: game.shots_against,
            saves: game.saves,
            savePercentage: savePercentage,
          };
        });
      }),
      catchError((error) => {
        console.error(`Failed to fetch recent games for goalie ${id}:`, error);
        return throwError(() => error);
      })
    );
  }
}
