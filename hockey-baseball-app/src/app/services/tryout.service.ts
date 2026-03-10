import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { TeamService } from './team.service';
import {
  TryoutEntry,
  TryoutEntryType,
  TryoutStatus,
  TryoutStatusHistoryEntry,
  TryoutStatusHistoryUser,
  PlayerTryoutApiOut,
  PlayerTryoutApiIn,
  PlayerTryoutApiUpdate,
  PlayerTryoutApiType,
} from '../shared/interfaces/tryout.interface';

const BASE_URL = '/hockey/player-tryouts';

function toApiType(type: TryoutEntryType): PlayerTryoutApiType {
  return type === 'goalie' ? 'goalies' : 'players';
}

@Injectable({
  providedIn: 'root',
})
export class TryoutService {
  private apiService = inject(ApiService);
  private teamService = inject(TeamService);

  getTryoutEntries(teamId?: number | null, type?: TryoutEntryType): Observable<TryoutEntry[]> {
    const playerType = toApiType(type ?? 'player');
    const query = teamId ? `?team_id=${teamId}` : '';
    return forkJoin({
      tryouts: this.apiService.get<PlayerTryoutApiOut[]>(`${BASE_URL}/list/${playerType}${query}`),
      teams: this.teamService.getTeams(),
    }).pipe(
      map(({ tryouts, teams }) => {
        const teamMap = new Map(
          teams.teams.map((t) => [
            parseInt(t.id),
            { name: t.name, logo: t.logo, group: t.group, level: t.level },
          ])
        );
        const entryType = type ?? 'player';
        return tryouts.map((t) =>
          entryType === 'goalie'
            ? this.mapGoalieTryoutToEntry(t, teamMap)
            : this.mapPlayerTryoutToEntry(t, teamMap)
        );
      }),
      catchError((error) => {
        console.error(`Failed to fetch ${playerType} tryouts:`, error);
        return throwError(() => error);
      })
    );
  }

  addToTryout(
    teamId: number | null,
    playerId: number,
    type: TryoutEntryType,
    note?: string
  ): Observable<{ id: number }> {
    const body: PlayerTryoutApiIn = {
      player_id: playerId,
      team_id: teamId,
      player_type: toApiType(type),
      status: TryoutStatus.TryingOut,
      notes: note || null,
    };
    return this.apiService.post<{ id: number }>(BASE_URL, body).pipe(
      catchError((error) => {
        console.error('Failed to add tryout:', error);
        return throwError(() => error);
      })
    );
  }

  updateTryoutStatus(
    tryoutId: number,
    type: TryoutEntryType,
    status: TryoutStatus,
    note?: string
  ): Observable<void> {
    const body: PlayerTryoutApiUpdate = { status, notes: note || null };
    return this.apiService.put<void>(`${BASE_URL}/${tryoutId}`, body).pipe(
      catchError((error) => {
        console.error('Failed to update tryout status:', error);
        return throwError(() => error);
      })
    );
  }

  removeFromTryout(tryoutId: number, type: TryoutEntryType): Observable<void> {
    return this.apiService.delete<void>(`${BASE_URL}/${tryoutId}`).pipe(
      catchError((error) => {
        console.error('Failed to delete tryout:', error);
        return throwError(() => error);
      })
    );
  }

  getStatusHistory(
    tryoutId: number,
    type: TryoutEntryType
  ): Observable<TryoutStatusHistoryEntry[]> {
    return this.apiService
      .get<TryoutStatusHistoryEntry[]>(`${BASE_URL}/${tryoutId}/status-history`)
      .pipe(
        catchError((error) => {
          console.error('Failed to fetch status history:', error);
          return throwError(() => error);
        })
      );
  }

  private mapPlayerTryoutToEntry(
    tryout: PlayerTryoutApiOut,
    teamMap: Map<number, { name: string; logo: string; group: string; level: string }>
  ): TryoutEntry {
    const playerTeam = teamMap.get(tryout.team_id);
    const player = tryout.player;

    return {
      id: String(player.id),
      tryoutId: tryout.id,
      playerId: String(player.id),
      firstName: player.first_name,
      lastName: player.last_name,
      position: player.position_name,
      shoots: player.shoots,
      jerseyNumber: player.number,
      team: tryout.team_name || playerTeam?.name || '',
      teamId: tryout.team_id,
      teamLogo: playerTeam?.logo || '',
      teamAgeGroup: playerTeam?.group || '',
      teamLevelName: playerTeam?.level || '',
      type: 'player',
      status: tryout.status,
      hasAnalytics: player.has_analytics,
      note: tryout.note,
      userId: tryout.user?.id ?? null,
      changedBy: this.formatChangedBy(tryout.changed_by),
      changedAt: tryout.changed_at,
    };
  }

  private mapGoalieTryoutToEntry(
    tryout: PlayerTryoutApiOut,
    teamMap: Map<number, { name: string; logo: string; group: string; level: string }>
  ): TryoutEntry {
    const goalieTeam = teamMap.get(tryout.team_id);
    const goalie = tryout.player;

    return {
      id: String(goalie.id),
      tryoutId: tryout.id,
      playerId: String(goalie.id),
      firstName: goalie.first_name,
      lastName: goalie.last_name,
      position: 'Goalie',
      shoots: goalie.shoots,
      jerseyNumber: goalie.number,
      team: tryout.team_name || goalieTeam?.name || '',
      teamId: tryout.team_id,
      teamLogo: goalieTeam?.logo || '',
      teamAgeGroup: goalieTeam?.group || '',
      teamLevelName: goalieTeam?.level || '',
      type: 'goalie',
      status: tryout.status,
      hasAnalytics: goalie.has_analytics,
      note: tryout.note,
      userId: tryout.user?.id ?? null,
      changedBy: this.formatChangedBy(tryout.changed_by),
      changedAt: tryout.changed_at,
    };
  }

  private formatChangedBy(user: TryoutStatusHistoryUser | null): string | null {
    if (!user) return null;
    return `${user.first_name} ${user.last_name}`.trim() || null;
  }
}
