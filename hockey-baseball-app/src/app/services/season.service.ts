import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Season } from '../shared/interfaces/season.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class SeasonService {
  private apiService = inject(ApiService);

  getSeasons(): Observable<Season[]> {
    return this.apiService.get<Season[]>('/hockey/season/list').pipe(
      catchError(error => {
        console.error('Failed to fetch seasons:', error);
        return throwError(() => error);
      })
    );
  }
}
