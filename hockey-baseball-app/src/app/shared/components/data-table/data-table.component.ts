import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Renderer2,
  inject,
  input,
  output,
  effect,
  computed,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule, MatTooltip } from '@angular/material/tooltip';
import { IconService } from '../../../services/icon.service';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { AppColor } from '../../constants/colors';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'actions' | 'dropdown' | 'custom' | 'date';
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  showTooltip?: boolean;
}

export interface TableAction {
  label: string;
  icon?: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
  iconOnly?: boolean;
  roleAccessName?: string;
  roleVisibilityName?: string;
  roleVisibilityTeamId?: string | ((item: Record<string, unknown>) => string | undefined);
  roleVisibilityAuthorId?: string | ((item: Record<string, unknown>) => string | undefined);
  condition?: (item: Record<string, unknown>) => boolean;
}

@Component({
  selector: 'app-data-table',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ButtonSmallComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  iconService = inject(IconService);

  columns = input<TableColumn[]>([]);
  data = input<T[]>([]);
  actions = input<TableAction[]>([]);
  loading = input(false);
  emptyMessage = input('No data available');

  actionClick = output<{ action: string; item: T }>();
  sort = output<{ column: string; direction: 'asc' | 'desc' }>();

  displayedColumns = computed(() => {
    const columnKeys = this.columns().map((col) => col.key);
    return this.actions().length > 0 ? [...columnKeys, 'actions'] : columnKeys;
  });

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

  getCellValueByKey(item: T, key: string): unknown {
    return this.getNestedValue(item, key);
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
    return path
      .split('.')
      .reduce((current: unknown, key: string) => (current as Record<string, unknown>)?.[key], obj);
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

    switch (column.key) {
      case 'weight':
        return `${new Intl.NumberFormat().format(Number(value))} lbs`;
      case 'height':
        return `Height: ${value}`;
      case 'birthYear':
        return `Born in ${value}`;
      default:
        if (column.type === 'number' && column.key !== 'birthYear') {
          return new Intl.NumberFormat().format(Number(value));
        }
        break;
    }

    return String(value);
  }

  isTextTruncated(element: HTMLElement): boolean {
    if (!element) return false;
    return element.scrollWidth > element.clientWidth;
  }

  onCellMouseEnter(
    cellElement: HTMLElement,
    matTooltip: MatTooltip,
    item: T,
    column: TableColumn
  ): void {
    if (column.showTooltip === true) {
      matTooltip.disabled = false;
      return;
    }

    if (column.showTooltip === false) {
      matTooltip.disabled = true;
      return;
    }

    const isTextTruncated = this.isTextTruncated(cellElement);
    matTooltip.disabled = !isTextTruncated;
  }

  getStatusBadgeClass(status: unknown): string {
    const statusNum = Number(status);
    const statusMap: Record<number, string> = {
      1: 'status-badge not-started',
      2: 'status-badge game-in-progress',
      3: 'status-badge game-over',
    };
    return statusMap[statusNum] || 'status-badge';
  }

  getStatusLabel(status: unknown): string {
    const statusNum = Number(status);
    const statusLabelMap: Record<number, string> = {
      1: 'Not Started',
      2: 'Game in Progress',
      3: 'Game Over',
    };
    return statusLabelMap[statusNum] || String(status);
  }

  getGameTypeBadgeClass(gameType: unknown): string {
    const typeStr = String(gameType || '');
    const typeMap: Record<string, string> = {
      'Regular Season': 'game-type-badge regular-season',
      Playoff: 'game-type-badge playoff',
      Tournament: 'game-type-badge tournament',
      Exhibition: 'game-type-badge exhibition',
      'Summer League': 'game-type-badge summer-league',
    };
    return typeMap[typeStr] || 'game-type-badge';
  }

  getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      dashboard: 'dashboard',
      edit: 'stylus',
      delete: 'delete',
      view: 'visibility',
      'view-profile': 'person',
      players: 'groups',
      goalies: 'shield',
      'shot-spray-chart': 'show_chart',
    };
    return iconMap[action] || 'more_vert';
  }

  getActionBg(variant?: 'primary' | 'secondary' | 'danger', action?: string): AppColor {
    if (action === 'delete') {
      return 'primary';
    }
    if (action === 'view') {
      return 'green';
    }

    switch (variant) {
      case 'primary':
        return 'primary';
      case 'danger':
        return 'primary';
      case 'secondary':
      default:
        return 'button_background';
    }
  }

  getActionBgHover(variant?: 'primary' | 'secondary' | 'danger', action?: string): AppColor {
    if (action === 'delete') {
      return 'primary';
    }
    if (action === 'view') {
      return 'green';
    }

    switch (variant) {
      case 'primary':
        return 'primary_dark';
      case 'danger':
        return 'primary';
      case 'secondary':
      default:
        return 'gray_tone1';
    }
  }

  getActionColor(variant?: 'primary' | 'secondary' | 'danger', action?: string): AppColor {
    if (action === 'view') {
      return 'green';
    }
    if (action === 'view-profile') {
      return 'upcoming';
    }
    if (action === 'edit') {
      return 'orange';
    }
    if (action === 'delete') {
      return 'primary';
    }
    if (action === 'shot-spray-chart') {
      return 'purple';
    }

    switch (variant) {
      case 'primary':
        return 'primary';
      case 'danger':
        return 'primary';
      case 'secondary':
      default:
        return 'text_secondary';
    }
  }

  getActionColorHover(variant?: 'primary' | 'secondary' | 'danger', action?: string): AppColor {
    if (action === 'view') {
      return 'green';
    }
    if (action === 'view-profile') {
      return 'upcoming';
    }
    if (action === 'edit') {
      return 'orange';
    }
    if (action === 'delete') {
      return 'primary';
    }
    if (action === 'shot-spray-chart') {
      return 'purple';
    }

    switch (variant) {
      case 'primary':
        return 'primary_dark';
      case 'danger':
        return 'primary';
      case 'secondary':
      default:
        return 'text_primary';
    }
  }
}
