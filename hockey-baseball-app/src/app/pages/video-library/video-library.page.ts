import { Component, OnInit, signal, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
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
import { ModalEvent, ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-video-library',
  imports: [DataTableComponent, MatIconModule, ComponentVisibilityByRoleDirective, ButtonLoadingComponent],
  templateUrl: './video-library.page.html',
  styleUrl: './video-library.page.scss',
})
export class VideoLibraryPage implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private videoService = inject(VideoService);
  private modalService = inject(ModalService);
  private toast = inject(ToastService);

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
          this.toast.show('Video deleted successfully', 'success');
        },
        error: (error) => {
          console.error('Error deleting video:', error);
          this.toast.show('Failed to delete video', 'error');
        },
      });
    }
  }

  private editVideo(video: Video): void {
    this.modalService.openModal(VideoFormModal, {
      name: 'Edit Video',
      icon: 'video_library',
      width: '600px',
      data: {
        video: video,
        isEditMode: true,
      },
      onCloseWithDataProcessing: (result: VideoApiRequest) => {
        this.videoService.updateVideo(video.id, result).subscribe({
          next: () => {
            this.toast.show('Video updated successfully', 'success');
            this.modalService.closeModal();
            this.loadVideos();
          },
          error: () => {
            this.toast.show('Failed to update video', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  private viewVideo(video: Video): void {
    this.modalService.openModal(VideoViewModal, {
      name: video.name,
      icon: 'play_circle',
      width: '900px',
      maxWidth: '95vw',
      data: { video },
    });
  }

  openAddVideoModal(): void {
    this.modalService.openModal(VideoFormModal, {
      name: 'Add Video',
      icon: 'video_library',
      width: '600px',
      data: {
        isEditMode: false,
      },
      onCloseWithDataProcessing: (result: VideoApiRequest) => {
        this.videoService.addVideo(result).subscribe({
          next: () => {
            this.toast.show('Video created successfully', 'success');
            this.modalService.closeModal();
            this.loadVideos();
          },
          error: () => {
            this.toast.show('Failed to create video', 'error');
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }
}
