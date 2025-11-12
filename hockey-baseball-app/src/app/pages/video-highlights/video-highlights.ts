import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { DataTableComponent, TableAction, TableColumn } from '../../shared/components/data-table/data-table';
import { HighlightsService } from '../../services/highlights.service';
import { HighlightReelApi, HighlightReelRow, HighlightReelUpsertPayload } from '../../shared/interfaces/highlight-reel.interface';
import { HighlightReelFormModalComponent, HighlightReelFormModalData } from '../../shared/components/highlight-reel-form-modal/highlight-reel-form-modal';

@Component({
  selector: 'app-video-highlights',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, DataTableComponent, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Video Highlights"></app-page-header>

      <!-- Create Highlight Reel Button -->
      <div class="mb-4 flex justify-end">
        <button 
          mat-raised-button 
          color="primary" 
          (click)="openCreateHighlightModal()"
          class="add-video-btn">
          <mat-icon>add</mat-icon>
          Create New Highlight Reel
        </button>
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
  styleUrl: './video-highlights.scss'
})
export class VideoHighlightsComponent implements OnInit {
  private highlightsService = inject(HighlightsService);
  private dialog = inject(MatDialog);

  rows = signal<HighlightReelRow[]>([]);
  loading = signal(true);

  tableColumns: TableColumn[] = [
    { key: 'name', label: 'Name', sortable: true, width: '220px' },
    { key: 'description', label: 'Description', sortable: true, width: '300px' },
    { key: 'dateCreatedFormatted', label: 'Date Created', sortable: true, type: 'text', width: '160px' },
    { key: 'createdBy', label: 'Created By', sortable: true, width: '160px' }
  ];

  tableActions: TableAction[] = [
    { label: 'View', action: 'view', variant: 'primary' },
    { label: 'Edit', action: 'edit', variant: 'secondary' },
    { label: 'Delete', action: 'delete', variant: 'danger' }
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
            dateCreated: date,
            dateCreatedFormatted: this.formatDateShort(date)
          } as HighlightReelRow;
        });
        this.rows.set(mapped);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading highlights:', error);
        this.loading.set(false);
      }
    });
  }

  onActionClick(event: { action: string; item: HighlightReelRow }): void {
    const { action, item } = event;
    switch (action) {
      case 'view':
        console.log('View highlight reel:', item);
        break;
      case 'edit':
        console.log('Edit highlight reel:', item);
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          this.loading.set(true);
          this.highlightsService.deleteHighlightReel(item.id).subscribe({
            next: () => {
              // Optimistically remove from current list
              const updated = this.rows().filter(r => r.id !== item.id);
              this.rows.set(updated);
              this.loading.set(false);
            },
            error: (error) => {
              console.error('Error deleting highlight reel:', error);
              this.loading.set(false);
              alert('Failed to delete highlight reel.');
            }
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

  private formatDateShort(date: Date): string {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.toLocaleString('en-US', { year: '2-digit' });
    return `${month}, ${day}, ${year}`; // e.g., Nov, 7, 25
  }

  openCreateHighlightModal(): void {
    const dialogRef = this.dialog.open(HighlightReelFormModalComponent, {
      width: '1400px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        isEditMode: false
      } as HighlightReelFormModalData,
      panelClass: 'schedule-form-modal-dialog'
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
          }
        });
      }
    });
  }
}
