import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Analysis,
  AnalyticsApiIn,
  AnalyticsApiOut,
  AnalysisTableData,
  AnalysisType,
} from '../shared/interfaces/analysis.interface';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  private apiService = inject(ApiService);

  getAnalyses(type: AnalysisType, entityId?: number): Observable<AnalysisTableData> {
    const endpoint = entityId
      ? `/hockey/analytics/list/${type}/${entityId}`
      : `/hockey/analytics/list/${type}`;

    return this.apiService.get<AnalyticsApiOut[]>(endpoint).pipe(
      map((apiAnalyses) => {
        const analytics = apiAnalyses.map((a) => this.mapApiToFrontend(a, type));
        return { analytics, total: analytics.length };
      }),
      catchError((error) => {
        console.error('Failed to fetch analytics:', error);
        return throwError(() => error);
      })
    );
  }

  getAnalysisById(id: number): Observable<AnalyticsApiOut> {
    return this.apiService.get<AnalyticsApiOut>(`/hockey/analytics/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to fetch analysis:', error);
        return throwError(() => error);
      })
    );
  }

  createAnalysis(data: AnalyticsApiIn): Observable<{ id: number }> {
    return this.apiService.post<{ id: number }>('/hockey/analytics', data).pipe(
      catchError((error) => {
        console.error('Failed to create analysis:', error);
        return throwError(() => error);
      })
    );
  }

  updateAnalysis(id: number, data: AnalyticsApiIn): Observable<void> {
    return this.apiService.put<void>(`/hockey/analytics/${id}`, data).pipe(
      catchError((error) => {
        console.error('Failed to update analysis:', error);
        return throwError(() => error);
      })
    );
  }

  deleteAnalysis(id: number): Observable<void> {
    return this.apiService.delete<void>(`/hockey/analytics/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to delete analysis:', error);
        return throwError(() => error);
      })
    );
  }

  private mapApiToFrontend(apiOut: AnalyticsApiOut, type: AnalysisType): Analysis {
    return {
      id: String(apiOut.id),
      type,
      entityId: this.resolveEntityId(apiOut, type),
      entityName: this.resolveEntityName(apiOut, type),
      author: apiOut.author,
      title: apiOut.title,
      analysis: apiOut.analysis,
      date: apiOut.date,
      time: apiOut.time?.split('.')[0] ?? '',
      ...this.resolveEntityFields(apiOut, type),
    };
  }

  private resolveEntityFields(apiOut: AnalyticsApiOut, type: AnalysisType): Partial<Analysis> {
    switch (type) {
      case 'team':
        return { city: apiOut.team?.city ?? '' };
      case 'player':
      case 'goalie':
        return { number: apiOut.player?.number };
      case 'game':
        return {
          score: apiOut.game ? `${apiOut.game.away_goals} - ${apiOut.game.home_goals}` : '',
          gameDate: apiOut.game?.date ?? '',
        };
    }
  }

  private resolveEntityName(apiOut: AnalyticsApiOut, type: AnalysisType): string {
    switch (type) {
      case 'team':
        return apiOut.team?.name ?? '';
      case 'player':
      case 'goalie':
        return apiOut.player ? `${apiOut.player.first_name} ${apiOut.player.last_name}` : '';
      case 'game':
        return apiOut.game ? `${apiOut.game.away_team_name} at ${apiOut.game.home_team_name}` : '';
    }
  }

  private resolveEntityId(apiOut: AnalyticsApiOut, type: AnalysisType): number {
    switch (type) {
      case 'team':
        return apiOut.team?.id ?? 0;
      case 'player':
      case 'goalie':
        return apiOut.player?.id ?? 0;
      case 'game':
        return apiOut.game?.id ?? 0;
    }
  }
}
