import { Component, OnInit, signal, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonLoadingComponent } from '../../shared/components/buttons/button-loading/button-loading.component';
import { ModalEvent, ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import {
  DataTableComponent,
  TableAction,
  TableColumn,
} from '../../shared/components/data-table/data-table.component';
import { HighlightsService } from '../../services/highlights.service';
import {
  HighlightReelApi,
  HighlightReelRow,
  HighlightReelUpsertPayload,
} from '../../shared/interfaces/highlight-reel.interface';
import {
  HighlightReelFormModal,
  HighlightReelFormModalData,
} from '../../shared/components/highlight-reel-form-modal/highlight-reel-form.modal';
import { HighlightReelViewModal } from '../../shared/components/highlight-reel-view-modal/highlight-reel-view.modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './video-highlights.role-map';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/roles/role.service';
import { TeamService } from '../../services/team.service';
import { GameEventNameService } from '../../services/game-event-name.service';
import { GameMetadataService } from '../../services/game-metadata.service';
import { ScheduleService } from '../../services/schedule.service';
import { forkJoin } from 'rxjs';
import { formatDateShortWithCommas } from '../../shared/utils/time-converter.util';

@Component({
  selector: 'app-video-highlights',
  imports: [
    DataTableComponent,
    MatIconModule,
    ComponentVisibilityByRoleDirective,
    ButtonLoadingComponent,
  ],
  templateUrl: './video-highlights.page.html',
  styleUrl: './video-highlights.page.scss',
})
export class VideoHighlightsPage implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private highlightsService = inject(HighlightsService);
  private modalService = inject(ModalService);
  private authService = inject(AuthService);
  private roleService = inject(RoleService);
  private toast = inject(ToastService);
  private teamService = inject(TeamService);
  private gameEventNameService = inject(GameEventNameService);
  private gameMetadataService = inject(GameMetadataService);
  private scheduleService = inject(ScheduleService);

  rows = signal<HighlightReelRow[]>([]);
  isAddLoading = signal(false);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true, width: '220px' },
    { key: 'description', label: 'Description', sortable: true, width: '300px' },
    {
      key: 'dateCreatedFormatted',
      label: 'Date Created',
      sortable: true,
      type: 'text',
      width: '160px',
    },
    { key: 'createdBy', label: 'Created By', sortable: true, width: '160px' },
  ];

  tableActions: TableAction[] = [
    { label: 'View', action: 'view', variant: 'green' },
    {
      label: 'Edit',
      action: 'edit',
      variant: 'orange',
      roleVisibilityName: 'edit-action',
      roleVisibilityAuthorId: (item: Record<string, unknown>) => item['userId']?.toString() ?? '',
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'red',
      roleVisibilityName: 'delete-action',
      roleVisibilityAuthorId: (item: Record<string, unknown>) => item['userId']?.toString() ?? '',
    },
  ];

  ngOnInit(): void {
    this.loadHighlights();
  }

  private loadHighlights(): void {
    this.loading.set(true);
    this.highlightsService.getHighlightReels().subscribe({
      next: (data: HighlightReelApi[]) => {
        const mapped: HighlightReelRow[] = data.map((item) => {
          const date = new Date(item.date);
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            createdBy: item.created_by,
            userId: item.user_id,
            dateCreated: date,
            dateCreatedFormatted: formatDateShortWithCommas(date),
          } as HighlightReelRow;
        });
        this.rows.set(mapped);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading highlights:', error);
        this.loading.set(false);
      },
    });
  }

  onActionClick(event: { action: string; item: HighlightReelRow }): void {
    const { action, item } = event;
    switch (action) {
      case 'view':
        this.openViewHighlightModal(item);
        break;
      case 'edit':
        this.openEditHighlightModal(item);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          this.loading.set(true);
          this.highlightsService.deleteHighlightReel(item.id).subscribe({
            next: () => {
              const updated = this.rows().filter((r) => r.id !== item.id);
              this.rows.set(updated);
              this.loading.set(false);
              this.toast.show('Highlight reel deleted successfully', 'success');
            },
            error: (error) => {
              console.error('Error deleting highlight reel:', error);
              this.loading.set(false);
              this.toast.show('Failed to delete highlight reel', 'error');
            },
          });
        }
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  onSort(event: { column: string; direction: 'asc' | 'desc' }): void {
    const { column, direction } = event;
    const sorted = [...this.rows()].sort((a, b) => {
      const aVal = this.getSortValue(a, column);
      const bVal = this.getSortValue(b, column);
      if (aVal === bVal) return 0;
      const res = (aVal as string | number) < (bVal as string | number) ? -1 : 1;
      return direction === 'asc' ? res : -res;
    });
    this.rows.set(sorted);
  }

  private getSortValue(row: HighlightReelRow, column: string): unknown {
    if (column === 'dateCreatedFormatted') return row.dateCreated.getTime();
    return (row as Record<string, unknown>)[column];
  }

  openCreateHighlightModal(): void {
    this.isAddLoading.set(true);
    this.loadHighlightFormData().subscribe({
      next: ({ teams, eventNames, gamePeriods, games }) => {
        this.isAddLoading.set(false);
        this.openHighlightModal({
          isEditMode: false,
          teams: teams.teams,
          eventNames,
          gamePeriods,
          games,
        });
      },
      error: () => {
        this.isAddLoading.set(false);
        this.toast.show('Failed to load form data', 'error');
      },
    });
  }

  openEditHighlightModal(item: HighlightReelRow): void {
    this.openHighlightModal({
      isEditMode: true,
      reel: {
        id: item.id,
        name: item.name,
        description: item.description,
      },
    });
  }

  private loadHighlightFormData() {
    return forkJoin({
      teams: this.teamService.getTeams(),
      eventNames: this.gameEventNameService.getGameEventNames(),
      gamePeriods: this.gameMetadataService.getGamePeriods(),
      games: this.scheduleService.getGameList(),
    });
  }

  private openHighlightModal(data: HighlightReelFormModalData): void {
    const isEdit = data.isEditMode;
    this.modalService.openModal(HighlightReelFormModal, {
      name: isEdit ? 'Edit Highlight Reel' : 'Create Highlight Reel',
      icon: 'movie',
      width: '1400px',
      maxWidth: '95vw',
      data,
      onCloseWithDataProcessing: (result: HighlightReelUpsertPayload) => {
        const apiCall =
          isEdit && data.reel
            ? this.highlightsService.updateHighlightReel(data.reel.id, result)
            : this.highlightsService.createHighlightReel(result);
        apiCall.subscribe({
          next: () => {
            this.toast.show(
              isEdit
                ? 'Highlight reel updated successfully'
                : 'Highlight reel created successfully',
              'success'
            );
            this.modalService.closeModal();
            this.loadHighlights();
          },
          error: () => {
            this.toast.show(
              isEdit ? 'Failed to update highlight reel' : 'Failed to create highlight reel',
              'error'
            );
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
          },
        });
      },
    });
  }

  openViewHighlightModal(item: HighlightReelRow): void {
    this.highlightsService.getHighlights(item.id).subscribe({
      next: (highlights) => {
        this.modalService.openModal(HighlightReelViewModal, {
          name: item.name,
          icon: 'play_circle',
          width: '1400px',
          maxWidth: '95vw',
          data: {
            reelName: item.name,
            highlights,
            initialIndex: 0,
          },
        });
      },
      error: (error) => {
        console.error('Error loading highlights for reel:', error);
        alert('Failed to load highlights for this reel.');
      },
    });
  }
}
