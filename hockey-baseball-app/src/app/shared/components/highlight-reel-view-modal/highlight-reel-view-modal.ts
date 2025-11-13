import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HighlightApi } from '../../interfaces/highlight-reel.interface';

export interface HighlightReelViewModalData {
  reelName: string;
  highlights: HighlightApi[];
  // Optionally select a starting item by highlight id or index
  initialHighlightId?: number;
  initialIndex?: number;
}

@Component({
  selector: 'app-highlight-reel-view-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './highlight-reel-view-modal.html',
  styleUrl: './highlight-reel-view-modal.scss',
})
export class HighlightReelViewModalComponent implements OnInit {
  private dialogRef = inject<MatDialogRef<HighlightReelViewModalComponent>>(MatDialogRef);
  private sanitizer = inject(DomSanitizer);
  data = inject<HighlightReelViewModalData>(MAT_DIALOG_DATA);

  highlights = signal<HighlightApi[]>([]);
  selectedIndex = signal<number>(0);
  selected = computed(() => this.highlights()[this.selectedIndex()] || null);
  videoUrl = signal<SafeResourceUrl | null>(null);
  videoMessage = signal<string | null>(null);

  ngOnInit(): void {
    const ordered = [...(this.data.highlights || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    this.highlights.set(ordered);

    // Determine initial selected index
    let startIdx = 0;
    if (typeof this.data.initialIndex === 'number' && ordered[this.data.initialIndex]) {
      startIdx = this.data.initialIndex;
    } else if (typeof this.data.initialHighlightId === 'number') {
      const idx = ordered.findIndex(h => h.id === this.data.initialHighlightId);
      startIdx = idx >= 0 ? idx : 0;
    }
    this.selectedIndex.set(startIdx);
    this.updateVideoForIndex(startIdx);
  }

  close(): void {
    this.dialogRef.close();
  }

  onRowClick(index: number): void {
    if (index === this.selectedIndex()) return;
    this.selectedIndex.set(index);
    this.updateVideoForIndex(index);
  }

  private updateVideoForIndex(index: number): void {
    const item = this.highlights()[index];
    if (!item) {
      this.videoUrl.set(null);
      this.videoMessage.set('Select a highlight on the right to play');
      return;
    }

    const link = item.youtube_link || '';
    const time = item.time || '';

    if (!link) {
      this.videoUrl.set(null);
      this.videoMessage.set('No video link available for this highlight.');
      return;
    }

    const { id } = this.extractYouTubeInfo(link, time);
    if (!id) {
      this.videoUrl.set(null);
      this.videoMessage.set('YouTube video is not available or the link is invalid.');
      return;
    }

    const safe = this.toEmbedUrl(link, time);
    this.videoUrl.set(safe);
    this.videoMessage.set(null);
  }

  // Convert arbitrary YouTube link + optional time to a safe embed URL
  private toEmbedUrl(link: string, apiTime: string): SafeResourceUrl {
    const { id, start } = this.extractYouTubeInfo(link, apiTime);
    if (!id) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }
    const params = new URLSearchParams();
    params.set('rel', '0');
    params.set('autoplay', '1');
    if (start > 0) params.set('start', String(start));
    const url = `https://www.youtube.com/embed/${id}?${params.toString()}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private extractYouTubeInfo(link: string, apiTime: string): { id: string | null; start: number } {
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

      // Fall back to API time (e.g., HH:MM:SS.sssZ) when URL doesn't include t/start
      if (!tParam && apiTime) {
        start = this.isoLikeTimeToSeconds(apiTime);
      }

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
      const id = this.maybeVideoId(link);
      return { id, start: 0 };
    }
  }

  private maybeVideoId(text: string): string | null {
    // Basic heuristic for 11-char YouTube IDs
    const m = text.match(/[a-zA-Z0-9_-]{11}/);
    return m ? m[0] : null;
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

  private isoLikeTimeToSeconds(timeStr: string): number {
    // Expect HH:MM:SS(.sss)?(Z)?
    const m = timeStr.match(/^(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return 0;
    const hh = parseInt(m[1], 10) || 0;
    const mm = parseInt(m[2], 10) || 0;
    const ss = parseInt(m[3], 10) || 0;
    return hh * 3600 + mm * 60 + ss;
  }

  // UI helpers
  formatDate(d?: string): string {
    return d || '-';
  }

  formatPeriodTime(time?: string): string {
    if (!time) return '-';
    // Show MM:SS from HH:MM:SS(.sss) if possible
    const m = time.match(/^(\d{2}):(\d{2}):(\d{2})/);
    if (!m) return time;
    const minutes = (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
    const ss = parseInt(m[3], 10) || 0;
    return `${minutes}:${ss.toString().padStart(2, '0')}`;
  }
}
