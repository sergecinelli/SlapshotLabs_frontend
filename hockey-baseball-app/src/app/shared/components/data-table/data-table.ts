import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ElementRef, Renderer2, AfterViewInit } from '@angular/core';
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
  type?: 'text' | 'number' | 'actions' | 'dropdown';
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
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatSortModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent implements AfterViewInit {
  @Input() columns: TableColumn[] = [];
  
  constructor(
    private elementRef: ElementRef,
    private renderer: Renderer2,
    public iconService: IconService
  ) {}
  @Input() set data(value: any[]) {
    this._data = value;
  }
  get data(): any[] {
    return this._data;
  }
  private _data: any[] = [];
  
  @Input() actions: TableAction[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No data available';
  
  @Output() actionClick = new EventEmitter<{ action: string, item: any }>();
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

  onActionClick(action: string, item: any): void {
    this.actionClick.emit({ action, item });
  }

  getCellValue(item: any, column: TableColumn): any {
    return this.getNestedValue(item, column.key);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  getTooltipText(item: any, column: TableColumn): string {
    const value = this.getCellValue(item, column);
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Special formatting for specific fields
    switch (column.key) {
      case 'weight':
        return `${new Intl.NumberFormat().format(value)} lbs`;
      case 'height':
        return `Height: ${value}`;
      case 'birthYear':
        return `Born in ${value}`;
      default:
        // General formatting for number types
        if (column.type === 'number' && column.key !== 'birthYear') {
          return new Intl.NumberFormat().format(value);
        }
        break;
    }
    
    return String(value);
  }

  ngAfterViewInit(): void {
    // Implementation for after view init if needed
  }

  isTextTruncated(element: HTMLElement): boolean {
    if (!element) return false;
    
    // Check if the element's scrollWidth is greater than its clientWidth
    // This indicates that the content is wider than the visible area
    return element.scrollWidth > element.clientWidth;
  }

  onCellMouseEnter(cellElement: HTMLElement, matTooltip: MatTooltip, item: any, column: TableColumn): void {
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
}
