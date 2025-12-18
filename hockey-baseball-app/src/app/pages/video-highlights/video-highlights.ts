import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../shared/components/buttons/button/button.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  DataTableComponent,
  TableAction,
  TableColumn,
} from '../../shared/components/data-table/data-table';
import { HighlightsService } from '../../services/highlights.service';
import {
  HighlightReelApi,
  HighlightReelRow,
  HighlightReelUpsertPayload,
} from '../../shared/interfaces/highlight-reel.interface';
import {
  HighlightReelFormModalComponent,
  HighlightReelFormModalData,
} from '../../shared/components/highlight-reel-form-modal/highlight-reel-form-modal';
import { HighlightReelViewModalComponent } from '../../shared/components/highlight-reel-view-modal/highlight-reel-view-modal';
import { ComponentVisibilityByRoleDirective } from '../../shared/directives/component-visibility-by-role.directive';
import { visibilityByRoleMap } from './video-highlights.role-map';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/roles/role.service';
import { formatDateShortWithCommas } from '../../shared/utils/time-converter.util';

@Component({
  selector: 'app-video-highlights',
  standalone: true,
  imports: [
    CommonModule,
    DataTableComponent,
    MatIconModule,
    MatDialogModule,
    ComponentVisibilityByRoleDirective,
    ButtonComponent,
  ],
  template: `
    <div class="page-content" [appVisibilityMap]="visibilityByRoleMap">

      <!-- Create Highlight Reel Button -->
      <div class="mb-4 flex justify-end">
        <app-button
          [bg]="'primary'"
          [bghover]="'primary_dark'"
          [color]="'white'"
          [colorhover]="'white'"
          [materialIcon]="'add'"
          [haveContent]="true"
          (clicked)="openCreateHighlightModal()"
          role-visibility-name="create-highlight-button"
        >
          Create New Highlight Reel
        </app-button>
      </div>

      <app-data-table
        [columns]="tableColumns"
        [data]="rows()"
        [actions]="tableActions"
        [loading]="loading()"
        (actionClick)="onActionClick($event)"
        (sort)="onSort($event)"
        emptyMessage="No highlight reels found."
      ></app-data-table>
    </div>
  `,
  styleUrl: './video-highlights.scss',
})
export class VideoHighlightsComponent implements OnInit {
  // Role-based access map
  protected visibilityByRoleMap = visibilityByRoleMap;

  private highlightsService = inject(HighlightsService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private roleService = inject(RoleService);

  rows = signal<HighlightReelRow[]>([]);
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
    { label: 'View', action: 'view', variant: 'primary' },
    {
      label: 'Edit',
      action: 'edit',
      variant: 'secondary',
      roleVisibilityName: 'edit-action',
      roleVisibilityAuthorId: (item: Record<string, unknown>) => item['userId']?.toString() ?? '',
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'danger',
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
              // Optimistically remove from current list
              const updated = this.rows().filter((r) => r.id !== item.id);
              this.rows.set(updated);
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error deleting highlight reel:', error);
              this.loading.set(false);
              alert('Failed to delete highlight reel.');
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
    const dialogRef = this.dialog.open(HighlightReelFormModalComponent, {
      width: '1400px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: {
        isEditMode: false,
      } as HighlightReelFormModalData,
      panelClass: 'schedule-form-modal-dialog',
    });

    dialogRef.afterClosed().subscribe((result?: HighlightReelUpsertPayload) => {
      if (result) {
        this.loading.set(true);
        this.highlightsService.createHighlightReel(result).subscribe({
          next: () => {
            this.loadHighlights();
          },
          error: (error) => {
            console.error('Error creating highlight reel:', error);
            this.loading.set(false);
          },
        });
      }
    });
  }

  openEditHighlightModal(item: HighlightReelRow): void {
    const dialogRef = this.dialog.open(HighlightReelFormModalComponent, {
      width: '1400px',
      maxWidth: '95vw',
      disableClose: true,
      autoFocus: false,
      data: {
        isEditMode: true,
        reel: {
          id: item.id,
          name: item.name,
          description: item.description,
        },
      } as HighlightReelFormModalData,
      panelClass: 'schedule-form-modal-dialog',
    });

    dialogRef.afterClosed().subscribe((result?: HighlightReelUpsertPayload) => {
      if (result) {
        this.loading.set(true);
        this.highlightsService.updateHighlightReel(item.id, result).subscribe({
          next: () => {
            this.loadHighlights();
          },
          error: (error) => {
            console.error('Error updating highlight reel:', error);
            this.loading.set(false);
          },
        });
      }
    });
  }

  openViewHighlightModal(item: HighlightReelRow): void {
    // Fetch highlights for the reel, then open the view modal with the list
    this.highlightsService.getHighlights(item.id).subscribe({
      next: (highlights) => {
        this.dialog.open(HighlightReelViewModalComponent, {
          width: '1400px',
          maxWidth: '95vw',
          autoFocus: false,
          data: {
            reelName: item.name,
            highlights,
            initialIndex: 0,
          },
          panelClass: 'highlight-reel-view-dialog',
        });
      },
      error: (error) => {
        console.error('Error loading highlights for reel:', error);
        alert('Failed to load highlights for this reel.');
      },
    });
  }
}
