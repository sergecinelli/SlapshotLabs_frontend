import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageService {
  private http = inject(HttpClient);

  /**
   * Get image URL with authentication
   * Loads image via HttpClient with credentials and converts to blob URL
   * Tries localhost API first, then falls back to staging if available
   */
  getAuthenticatedImageUrl(imagePath: string): Observable<string> {
    const apiUrl = environment.apiUrl;
    const imageApiUrl = (environment as any).imageApiUrl;
    
    // Try localhost API first (has proper cookies)
    const localhostUrl = imagePath.startsWith('http') ? imagePath : `${apiUrl}${imagePath}`;
    
    return this.http
      .get(localhostUrl, {
        responseType: 'blob',
        withCredentials: true, // Send cookies for authentication
        headers: {
          Accept: 'image/*', // Accept any image type
        },
      })
      .pipe(
        map((blob) => {
          // Check if response is actually an error (JSON response from server)
          if (blob.type === 'application/json') {
            throw new Error('Server returned error instead of image');
          }

          // Verify it's actually an image blob
          if (blob.type.startsWith('image/')) {
            // Create object URL from blob
            return URL.createObjectURL(blob);
          } else {
            // If not an image, might be an error response, throw error
            throw new Error(`Unexpected content type: ${blob.type}`);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          // If localhost fails and we have staging URL, try staging as fallback
          if (error.status >= 400 && imageApiUrl && imageApiUrl !== apiUrl) {
            const stagingUrl = imagePath.startsWith('http') ? imagePath : `${imageApiUrl}${imagePath}`;
            console.warn('Localhost API failed, trying staging:', stagingUrl);
            
            return this.http
              .get(stagingUrl, {
                responseType: 'blob',
                withCredentials: true,
                headers: {
                  Accept: 'image/*',
                },
              })
              .pipe(
                map((blob) => {
                  if (blob.type === 'application/json') {
                    throw new Error('Staging server returned error instead of image');
                  }
                  if (blob.type.startsWith('image/')) {
                    return URL.createObjectURL(blob);
                  }
                  throw new Error(`Unexpected content type: ${blob.type}`);
                }),
                catchError((stagingError: HttpErrorResponse) => {
                  console.error('Both localhost and staging failed to load image:', imagePath, stagingError);
                  return throwError(() => stagingError);
                })
              );
          }
          
          console.error('Failed to load image:', localhostUrl, error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get team logo URL with authentication
   */
  getTeamLogoUrl(teamId: number): Observable<string> {
    return this.getAuthenticatedImageUrl(`/hockey/team/${teamId}/logo`);
  }

  /**
   * Revoke object URL to free memory
   */
  revokeObjectUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

