import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent } from '../buttons/button/button.component';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Video } from '../../interfaces/video.interface';

export interface VideoViewModalData {
  video: Video;
}

@Component({
  selector: 'app-video-view-modal',
  imports: [MatDialogModule, ButtonComponent, MatIconModule],
  templateUrl: './video-view.modal.html',
  styleUrl: './video-view.modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoViewModal implements OnInit {
  private dialogRef = inject<MatDialogRef<VideoViewModal>>(MatDialogRef);
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

    const { id, start } = this.extractYouTubeInfo(link);
    if (!id) {
      this.videoUrl.set(null);
      this.videoMessage.set('YouTube video is not available or the link is invalid.');
      return;
    }

    const safe = this.toEmbedUrl(id, start);
    this.videoUrl.set(safe);
    this.videoMessage.set(null);
  }

  private toEmbedUrl(videoId: string, start: number): SafeResourceUrl {
    const params = new URLSearchParams();
    params.set('rel', '0');
    params.set('autoplay', '1');
    if (start > 0) params.set('start', String(start));
    const url = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private extractYouTubeInfo(link: string): { id: string | null; start: number } {
    if (!link) {
      return { id: null, start: 0 };
    }

    try {
      const u = new URL(link);
      let id: string | null = null;
      let start = 0;

      // Parse start seconds from URL t or start param
      const tParam = u.searchParams.get('t') || u.searchParams.get('start');
      if (tParam) start = this.parseYouTubeTimeToSeconds(tParam);

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
      return { id: id || null, start: start || 0 };
    } catch {
      // Not a valid URL, try to treat as raw ID
      const m = link.match(/[a-zA-Z0-9_-]{11}/);
      return { id: m ? m[0] : null, start: 0 };
    }
  }

  private parseYouTubeTimeToSeconds(t: string): number {
    // Supports formats like 1h2m3s, 2m10s, 75s, or plain seconds "123"
    const h = t.match(/(\d+)h/);
    const m = t.match(/(\d+)m/);
    const s = t.match(/(\d+)s/);
    if (h || m || s) {
      const hh = h ? parseInt(h[1], 10) : 0;
      const mm = m ? parseInt(m[1], 10) : 0;
      const ss = s ? parseInt(s[1], 10) : 0;
      return hh * 3600 + mm * 60 + ss;
    }
    const asInt = parseInt(t, 10);
    return Number.isFinite(asInt) ? Math.max(0, asInt) : 0;
  }
}
