import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  HighlightReelApi,
  HighlightReelUpsertPayload,
  HighlightApi,
  HighlightCreatePayload,
} from '../shared/interfaces/highlight-reel.interface';

@Injectable({ providedIn: 'root' })
export class HighlightsService {
  private api = inject(ApiService);

  // Highlight Reel endpoints
  getHighlightReels(): Observable<HighlightReelApi[]> {
    return this.api.get<HighlightReelApi[]>('/hockey/highlight-reels');
  }

  createHighlightReel(payload: HighlightReelUpsertPayload): Observable<HighlightReelApi> {
    return this.api.post<HighlightReelApi>('/hockey/highlight-reels', payload);
  }

  updateHighlightReel(
    id: number,
    payload: HighlightReelUpsertPayload
  ): Observable<HighlightReelApi> {
    return this.api.put<HighlightReelApi>(`/hockey/highlight-reels/${id}`, payload);
  }

  deleteHighlightReel(id: number): Observable<unknown> {
    return this.api.delete<unknown>(`/hockey/highlight-reels/${id}`);
  }

  // Highlight endpoints (nested under reel)
  getHighlights(reelId: number): Observable<HighlightApi[]> {
    return this.api.get<HighlightApi[]>(`/hockey/highlight-reels/${reelId}/highlights`);
  }

  createHighlight(reelId: number, payload: HighlightCreatePayload): Observable<HighlightApi> {
    return this.api.post<HighlightApi>(`/hockey/highlight-reels/${reelId}/highlights`, payload);
  }

  deleteHighlight(reelId: number, highlightId: number): Observable<unknown> {
    return this.api.delete<unknown>(`/hockey/highlight-reels/${reelId}/highlights/${highlightId}`);
  }
}
