import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'actions' | 'dropdown';
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableAction {
  label: string;
  icon?: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatSortModule, MatProgressSpinnerModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
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
}
