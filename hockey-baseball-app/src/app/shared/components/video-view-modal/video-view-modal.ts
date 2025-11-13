import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Video } from '../../interfaces/video.interface';

export interface VideoViewModalData {
  video: Video;
}

@Component({
  selector: 'app-video-view-modal',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './video-view-modal.html',
  styleUrl: './video-view-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoViewModalComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<VideoViewModalComponent>>(MatDialogRef);
  private sanitizer = inject(DomSanitizer);
  data = inject<VideoViewModalData>(MAT_DIALOG_DATA);

  videoUrl = signal<SafeResourceUrl | null>(null);
  videoMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadVideo();
  }

  close(): void {
    this.dialogRef.close();
  }

  private loadVideo(): void {
    const link = this.data.video.youtube_link;

    if (!link) {
      this.videoUrl.set(null);
      this.videoMessage.set('No video link available.');
      return;
    }

    const videoId = this.extractYouTubeId(link);
    if (!videoId) {
      this.videoUrl.set(null);
      this.videoMessage.set('YouTube video is not available or the link is invalid.');
      return;
    }

    const safe = this.toEmbedUrl(videoId);
    this.videoUrl.set(safe);
    this.videoMessage.set(null);
  }

  private toEmbedUrl(videoId: string): SafeResourceUrl {
    const params = new URLSearchParams();
    params.set('rel', '0');
    params.set('autoplay', '1');
    const url = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private extractYouTubeId(link: string): string | null {
    if (!link) {
      return null;
    }
    
    try {
      const u = new URL(link);
      let id: string | null = null;

      if (u.hostname.includes('youtu.be')) {
        // path is /VIDEO_ID
        id = u.pathname.replace('/', '').split('/')[0] || null;
      } else if (u.hostname.includes('youtube.com')) {
        if (u.pathname.startsWith('/watch')) {
          id = u.searchParams.get('v');
        } else if (u.pathname.startsWith('/embed/')) {
          id = u.pathname.split('/')[2] || null;
        } else if (u.pathname.startsWith('/shorts/')) {
          id = u.pathname.split('/')[2] || null;
        }
      }
      return id;
    } catch {
      // Not a valid URL, try to treat as raw ID
      const m = link.match(/[a-zA-Z0-9_-]{11}/);
      return m ? m[0] : null;
    }
  }
}
