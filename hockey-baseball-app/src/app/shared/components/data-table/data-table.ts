import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ElementRef, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule, MatTooltip } from '@angular/material/tooltip';
import { IconService } from '../../../services/icon.service';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'actions' | 'dropdown' | 'custom' | 'date';
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  showTooltip?: boolean; // Optional: control tooltip visibility per column
}

export interface TableAction {
  label: string;
  icon?: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
  iconOnly?: boolean; // When true, only show icon without label
  condition?: (item: Record<string, unknown>) => boolean; // Optional condition to show/hide action
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatSortModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  iconService = inject(IconService);

  @Input() columns: TableColumn[] = [];
  @Input() set data(value: T[]) {
    this._data = value;
  }
  get data(): T[] {
    return this._data;
  }
  private _data: T[] = [];
  
  @Input() actions: TableAction[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No data available';
  
  @Output() actionClick = new EventEmitter<{ action: string, item: T }>();
  @Output() sort = new EventEmitter<{ column: string, direction: 'asc' | 'desc' }>();

  get displayedColumns(): string[] {
    const columnKeys = this.columns.map(col => col.key);
    return this.actions.length > 0 ? [...columnKeys, 'actions'] : columnKeys;
  }

  onSortChange(sort: Sort): void {
    if (sort.active && sort.direction) {
      this.sort.emit({ column: sort.active, direction: sort.direction as 'asc' | 'desc' });
    }
  }

  onActionClick(action: string, item: T): void {
    this.actionClick.emit({ action, item });
  }

  getCellValue(item: T, column: TableColumn): unknown {
    return this.getNestedValue(item, column.key);
  }

  getDateValue(item: T, column: TableColumn): Date | null {
    const value = this.getCellValue(item, column);
    if (value === null || value === undefined) return null;
    
    if (value instanceof Date) {
      return value;
    }
    
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
  }

  getNumberValue(item: T, column: TableColumn): number | null {
    const value = this.getCellValue(item, column);
    if (value === null || value === undefined) return null;
    const numValue = Number(value);
    return isNaN(numValue) ? null : numValue;
  }

  getTooltipText(item: T, column: TableColumn): string {
    const value = this.getCellValue(item, column);
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Special formatting for specific fields
    switch (column.key) {
      case 'weight':
        return `${new Intl.NumberFormat().format(Number(value))} lbs`;
      case 'height':
        return `Height: ${value}`;
      case 'birthYear':
        return `Born in ${value}`;
      default:
        // General formatting for number types
        if (column.type === 'number' && column.key !== 'birthYear') {
          return new Intl.NumberFormat().format(Number(value));
        }
        break;
    }
    
    return String(value);
  }


  isTextTruncated(element: HTMLElement): boolean {
    if (!element) return false;
    
    // Check if the element's scrollWidth is greater than its clientWidth
    // This indicates that the content is wider than the visible area
    return element.scrollWidth > element.clientWidth;
  }

  onCellMouseEnter(cellElement: HTMLElement, matTooltip: MatTooltip, item: T, column: TableColumn): void {
    // Always show tooltip if explicitly enabled for the column
    if (column.showTooltip === true) {
      matTooltip.disabled = false;
      return;
    }
    
    // Never show tooltip if explicitly disabled for the column  
    if (column.showTooltip === false) {
      matTooltip.disabled = true;
      return;
    }
    
    // Default behavior: show tooltip only if text is truncated
    const isTextTruncated = this.isTextTruncated(cellElement);
    matTooltip.disabled = !isTextTruncated;
  }

  // Custom rendering methods for schedule-specific fields
  getStatusBadgeClass(status: unknown): string {
    const statusNum = Number(status);
    const statusMap: Record<number, string> = {
      1: 'status-badge not-started',
      2: 'status-badge game-in-progress',
      3: 'status-badge game-over'
    };
    return statusMap[statusNum] || 'status-badge';
  }

  getStatusLabel(status: unknown): string {
    const statusNum = Number(status);
    const statusLabelMap: Record<number, string> = {
      1: 'Not Started',
      2: 'Game in Progress',
      3: 'Game Over'
    };
    return statusLabelMap[statusNum] || String(status);
  }

  getGameTypeBadgeClass(gameType: unknown): string {
    const typeStr = String(gameType || '');
    const typeMap: Record<string, string> = {
      'Regular Season': 'game-type-badge regular-season',
      'Playoff': 'game-type-badge playoff',
      'Tournament': 'game-type-badge tournament',
      'Exhibition': 'game-type-badge exhibition',
      'Summer League': 'game-type-badge summer-league'
    };
    return typeMap[typeStr] || 'game-type-badge';
  }
}
