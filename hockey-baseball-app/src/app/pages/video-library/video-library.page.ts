import { Component, OnInit, signal, inject } from '@angular/core';
import {  } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { MatDialog } from '@angular/material/dialog';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../shared/components/data-table/data-table.component';
import { VideoService } from '../../services/video.service';
import { Video, VideoApiRequest } from '../../shared/interfaces/video.interface';
import { VideoFormModal } from '../../shared/components/video-form-modal/video-form.modal';
import { VideoViewModal } from '../../shared/components/video-view-modal/video-view.modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './video-library.role-map';

@Component({
  selector: 'app-video-library',
  imports: [
    DataTableComponent,
    MatIconModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
  ],
  templateUrl: './video-library.page.html',
  styleUrl: './video-library.page.scss',
})
export class VideoLibraryPage implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private videoService = inject(VideoService);
  private dialog = inject(MatDialog);

  videos = signal<Video[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true, width: '200px' },
    { key: 'description', label: 'Description', sortable: true, width: '250px' },
    { key: 'youtube_link', label: 'YouTube Link', sortable: false, width: '200px' },
    { key: 'date', label: 'Date Added', sortable: true, type: 'date', width: '150px' },
    { key: 'added_by', label: 'Added By', sortable: true, width: '150px' },
  ];

  tableActions: TableAction[] = [
    { label: 'Delete', action: 'delete', variant: 'danger', roleVisibilityName: 'delete-action' },
    { label: 'Edit', action: 'edit', variant: 'secondary', roleVisibilityName: 'edit-action' },
    { label: 'View', action: 'view', variant: 'primary' },
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
      },
    });
  }

  onActionClick(event: { action: string; item: Video }): void {
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

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
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
    if (confirm(`Are you sure you want to delete "${video.name}"?`)) {
      this.videoService.deleteVideo(video.id).subscribe({
        next: () => {
          const updatedVideos = this.videos().filter((v) => v.id !== video.id);
          this.videos.set(updatedVideos);
        },
        error: (error) => {
          console.error('Error deleting video:', error);
          alert('Failed to delete video. Please try again.');
        },
      });
    }
  }

  private editVideo(video: Video): void {
    const dialogRef = this.dialog.open(VideoFormModal, {
      width: '600px',
      panelClass: 'video-form-modal-dialog',
      data: {
        video: video,
        isEditMode: true,
      },
    });

    dialogRef.afterClosed().subscribe((result: VideoApiRequest) => {
      if (result) {
        this.videoService.updateVideo(video.id, result).subscribe({
          next: () => {
            // Refresh the entire table after updating
            this.loadVideos();
          },
          error: (error) => {
            console.error('Error updating video:', error);
            alert('Failed to update video. Please try again.');
          },
        });
      }
    });
  }

  private viewVideo(video: Video): void {
    this.dialog.open(VideoViewModal, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'video-view-modal-dialog',
      data: {
        video: video,
      },
    });
  }

  openAddVideoModal(): void {
    const dialogRef = this.dialog.open(VideoFormModal, {
      width: '600px',
      panelClass: 'video-form-modal-dialog',
      data: {
        isEditMode: false,
      },
    });

    dialogRef.afterClosed().subscribe((result: VideoApiRequest) => {
      if (result) {
        this.videoService.addVideo(result).subscribe({
          next: () => {
            // Refresh the entire table after adding
            this.loadVideos();
          },
          error: (error) => {
            console.error('Error adding video:', error);
            alert('Failed to add video. Please try again.');
          },
        });
      }
    });
  }
}
