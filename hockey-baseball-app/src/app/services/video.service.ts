import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Video } from '../shared/interfaces/video.interface';

export interface VideoTableData {
  videos: Video[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private mockVideos: Video[] = [
    {
      id: 1,
      name: 'Burlington vs. Brampton',
      description: 'Home opener',
      dateAdded: new Date('2025-09-10'),
      addedBy: 'Joe Smith',
      createdAt: new Date('2025-09-10')
    },
    {
      id: 2,
      name: 'Burlington vs. Brampton',
      description: 'Home opener',
      dateAdded: new Date('2025-09-10'),
      addedBy: 'Joe Smith',
      createdAt: new Date('2025-09-10')
    },
    {
      id: 3,
      name: 'Burlington vs. Brampton',
      description: 'Home opener',
      dateAdded: new Date('2025-09-10'),
      addedBy: 'Joe Smith',
      createdAt: new Date('2025-09-10')
    },
    {
      id: 4,
      name: 'Burlington vs. Brampton',
      description: 'Home opener',
      dateAdded: new Date('2025-09-10'),
      addedBy: 'Joe Smith',
      createdAt: new Date('2025-09-10')
    }
  ];

  getVideos(): Observable<VideoTableData> {
    return of({
      videos: [...this.mockVideos],
      total: this.mockVideos.length
    }).pipe(delay(500)); // Simulate network delay
  }

  getVideoById(id: number): Observable<Video | undefined> {
    const video = this.mockVideos.find(v => v.id === id);
    return of(video).pipe(delay(300));
  }

  deleteVideo(id: number): Observable<boolean> {
    const index = this.mockVideos.findIndex(v => v.id === id);
    if (index !== -1) {
      this.mockVideos.splice(index, 1);
      return of(true).pipe(delay(300));
    }
    return throwError(() => new Error('Video not found'));
  }

  addVideo(videoData: Partial<Video>): Observable<Video> {
    const newVideo: Video = {
      id: Math.max(...this.mockVideos.map(v => v.id), 0) + 1,
      name: videoData.name || '',
      description: videoData.description || '',
      dateAdded: videoData.dateAdded || new Date(),
      addedBy: videoData.addedBy || 'Current User',
      createdAt: new Date()
    };
    this.mockVideos.unshift(newVideo);
    return of(newVideo).pipe(delay(300));
  }

  updateVideo(id: number, videoData: Partial<Video>): Observable<Video> {
    const index = this.mockVideos.findIndex(v => v.id === id);
    if (index !== -1) {
      this.mockVideos[index] = {
        ...this.mockVideos[index],
        ...videoData,
        id: this.mockVideos[index].id,
        updatedAt: new Date()
      };
      return of(this.mockVideos[index]).pipe(delay(300));
    }
    return throwError(() => new Error('Video not found'));
  }
}
