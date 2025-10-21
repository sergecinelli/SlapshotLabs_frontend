import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableColumn, TableAction } from '../../shared/components/data-table/data-table';
import { VideoService } from '../../services/video.service';
import { Video } from '../../shared/interfaces/video.interface';

@Component({
  selector: 'app-video-library',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, MatButtonModule, MatIconModule],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Video Library"></app-page-header>
      
      <!-- Add Video Button -->
      <div class="mb-4 flex justify-end">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="openAddVideoModal()"
          class="add-video-btn">
          <mat-icon>add</mat-icon>
          Add a Video
        </button>
      </div>
      
      <app-data-table
        [columns]="tableColumns"
        [data]="videos()"
        [actions]="tableActions"
        [loading]="loading()"
        (actionClick)="onActionClick($event)"
        (sort)="onSort($event)"
        emptyMessage="No videos found."
      ></app-data-table>
    </div>
  `,
  styleUrl: './video-library.scss'
})
export class VideoLibraryComponent implements OnInit {
  private videoService = inject(VideoService);

  videos = signal<Video[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true, width: '200px' },
    { key: 'description', label: 'Description', sortable: true, width: '250px' },
    { key: 'dateAdded', label: 'Date Added', sortable: true, type: 'date', width: '150px' },
    { key: 'addedBy', label: 'Added By', sortable: true, width: '150px' }
  ];

  tableActions: TableAction[] = [
    { label: 'Delete', action: 'delete', variant: 'danger' },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'View', action: 'view', variant: 'primary' }
  ];

  ngOnInit(): void {
    this.loadVideos();
  }

  private loadVideos(): void {
    this.loading.set(true);
    this.videoService.getVideos().subscribe({
      next: (data) => {
        this.videos.set(data.videos);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading videos:', error);
        this.loading.set(false);
      }
    });
  }

  onActionClick(event: { action: string, item: Video }): void {
    const { action, item } = event;
    
    switch (action) {
      case 'delete':
        this.deleteVideo(item);
        break;
      case 'edit':
        this.editVideo(item);
        break;
      case 'view':
        this.viewVideo(item);
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  }

  onSort(event: { column: string, direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sortedVideos = [...this.videos()].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[column];
      const bValue = (b as Record<string, unknown>)[column];
      
      if (aValue === bValue) return 0;
      
      const result = (aValue as string | number) < (bValue as string | number) ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
    
    this.videos.set(sortedVideos);
  }

  private deleteVideo(video: Video): void {
    if (confirm(`Are you sure you want to delete ${video.name}?`)) {
      this.videoService.deleteVideo(video.id).subscribe({
        next: (success) => {
          if (success) {
            const updatedVideos = this.videos().filter(v => v.id !== video.id);
            this.videos.set(updatedVideos);
          }
        },
        error: (error) => {
          console.error('Error deleting video:', error);
        }
      });
    }
  }

  private editVideo(video: Video): void {
    console.log('Edit video:', video);
    // TODO: Open edit modal
  }

  private viewVideo(video: Video): void {
    console.log('View video:', video);
    // TODO: Open video viewer
  }

  openAddVideoModal(): void {
    console.log('Add video modal');
    // TODO: Open add video modal
  }
}
