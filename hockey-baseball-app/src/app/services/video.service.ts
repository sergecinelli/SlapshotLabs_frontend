import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Video, VideoApiResponse, VideoApiRequest } from '../shared/interfaces/video.interface';
import { ApiService } from './api.service';

export interface VideoTableData {
  videos: Video[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  private apiService = inject(ApiService);

  /**
   * Get all videos from the API
   */
  getVideos(): Observable<VideoTableData> {
    return this.apiService.get<VideoApiResponse[]>('/hockey/video-library').pipe(
      map((apiVideos) => {
        const videos = apiVideos.map((apiVideo) => this.fromApiFormat(apiVideo));
        return {
          videos,
          total: videos.length,
        };
      }),
      catchError((error) => {
        console.error('Failed to fetch videos:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single video by ID
   */
  getVideoById(id: number): Observable<Video | undefined> {
    return this.apiService.get<VideoApiResponse>(`/hockey/video-library/${id}`).pipe(
      map((apiVideo) => this.fromApiFormat(apiVideo)),
      catchError((error) => {
        console.error(`Failed to fetch video with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a video
   */
  deleteVideo(id: number): Observable<boolean> {
    return this.apiService.delete<void>(`/hockey/video-library/${id}`).pipe(
      map(() => true),
      catchError((error) => {
        console.error(`Failed to delete video with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Add a new video
   */
  addVideo(videoData: VideoApiRequest): Observable<Video> {
    return this.apiService.post<VideoApiResponse>('/hockey/video-library', videoData).pipe(
      map((apiVideo) => this.fromApiFormat(apiVideo)),
      catchError((error) => {
        console.error('Failed to add video:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing video
   * Note: PATCH returns 204 No Content
   */
  updateVideo(id: number, videoData: VideoApiRequest): Observable<boolean> {
    return this.apiService.patch<void>(`/hockey/video-library/${id}`, videoData).pipe(
      map(() => true),
      catchError((error) => {
        console.error(`Failed to update video with ID ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Convert API format to frontend format
   */
  private fromApiFormat(apiVideo: VideoApiResponse): Video {
    return {
      id: apiVideo.id,
      name: apiVideo.name,
      description: apiVideo.description,
      youtube_link: apiVideo.youtube_link,
      added_by: apiVideo.added_by,
      date: apiVideo.date,
    };
  }
}
