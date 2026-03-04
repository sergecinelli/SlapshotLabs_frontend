import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  Analysis,
  AnalysisApiIn,
  AnalysisApiOut,
  AnalysisTableData,
  AnalysisType,
} from '../shared/interfaces/analysis.interface';

@Injectable({
  providedIn: 'root',
})
export class AnalysisService {
  private apiService = inject(ApiService);

  getAnalyses(type?: AnalysisType, entityId?: number): Observable<AnalysisTableData> {
    let endpoint = '/hockey/analysis/list';
    const params: string[] = [];

    if (type) {
      params.push(`type=${type}`);
    }
    if (entityId) {
      params.push(`entity_id=${entityId}`);
    }
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    return this.apiService.get<AnalysisApiOut[]>(endpoint).pipe(
      map((apiAnalyses) => {
        const analyses = apiAnalyses.map((a) => this.mapApiToFrontend(a));
        return { analyses, total: analyses.length };
      }),
      catchError((error) => {
        console.error('Failed to fetch analyses:', error);
        return throwError(() => error);
      })
    );
  }

  getAnalysisById(id: string): Observable<Analysis> {
    const numericId = parseInt(id, 10);
    return this.apiService.get<AnalysisApiOut>(`/hockey/analysis/${numericId}`).pipe(
      map((apiAnalysis) => this.mapApiToFrontend(apiAnalysis)),
      catchError((error) => {
        console.error('Failed to fetch analysis:', error);
        return throwError(() => error);
      })
    );
  }

  createAnalysis(data: AnalysisApiIn): Observable<{ id: number; success: boolean }> {
    return this.apiService.post<{ id: number; success: boolean }>('/hockey/analysis', data).pipe(
      catchError((error) => {
        console.error('Failed to create analysis:', error);
        return throwError(() => error);
      })
    );
  }

  updateAnalysis(id: string, data: Partial<AnalysisApiIn>): Observable<{ success: boolean }> {
    const numericId = parseInt(id, 10);
    return this.apiService.patch<{ success: boolean }>(`/hockey/analysis/${numericId}`, data).pipe(
      catchError((error) => {
        console.error('Failed to update analysis:', error);
        return throwError(() => error);
      })
    );
  }

  deleteAnalysis(id: string): Observable<{ success: boolean }> {
    const numericId = parseInt(id, 10);
    return this.apiService.delete<{ success: boolean }>(`/hockey/analysis/${numericId}`).pipe(
      catchError((error) => {
        console.error('Failed to delete analysis:', error);
        return throwError(() => error);
      })
    );
  }

  private mapApiToFrontend(apiOut: AnalysisApiOut): Analysis {
    const createdAt = new Date(apiOut.created_at);
    return {
      id: String(apiOut.id),
      type: apiOut.type,
      entityId: apiOut.entity_id,
      entityName: apiOut.entity_name,
      analysisBy: apiOut.analysis_by,
      analysisText: apiOut.analysis_text,
      date: createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: createdAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      createdAt,
    };
  }
}
