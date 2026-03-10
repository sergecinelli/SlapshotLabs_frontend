import {
  Component,
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
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { MatTooltipModule, MatTooltip } from '@angular/material/tooltip';
import { IconService } from '../../../services/icon.service';
import { ButtonSmallComponent } from '../buttons/button-small/button-small.component';
import { ButtonRouteSmallComponent } from '../buttons/button-route-small/button-route-small.component';
import { AppColor } from '../../constants/colors';
import { CachedSrcDirective } from '../../directives/cached-src.directive';
import { ClickableLinkComponent } from '../clickable-link/clickable-link.component';
import {
  getStatusStyle,
  getStatusTooltip,
  STATUS_COLOR,
  STATUS_TOOLTIP_DELAY,
} from '../../constants/statuses.constants';

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
  variant?: 'red' | 'green' | 'blue' | 'orange' | 'purple' | 'gray';
  iconOnly?: boolean;
  roleAccessName?: string;
  roleVisibilityName?: string;
  roleVisibilityTeamId?: string | ((item: Record<string, unknown>) => string | undefined);
  roleVisibilityAuthorId?: string | ((item: Record<string, unknown>) => string | undefined);
  condition?: (item: Record<string, unknown>) => boolean;
  isDisabled?: (item: Record<string, unknown>) => boolean;
  tooltip?: string | ((item: Record<string, unknown>) => string | null);
  route?: (item: Record<string, unknown>) => string;
  isLoading?: (item: Record<string, unknown>) => boolean;
}

@Component({
  selector: 'app-data-table',
  imports: [
    CachedSrcDirective,
    DatePipe,
    DecimalPipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatSortModule,
    LoadingSpinnerComponent,
    MatTooltipModule,
    ButtonSmallComponent,
    ButtonRouteSmallComponent,
    ClickableLinkComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  iconService = inject(IconService);

  readonly tooltipDelay = STATUS_TOOLTIP_DELAY;

  columns = input<TableColumn[]>([]);
  data = input<T[]>([]);
  actions = input<TableAction[]>([]);
  loading = input(false);
  loadingMessage = input('Loading...');
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

  getCellStringByKey(item: T, key: string): string {
    return String(this.getNestedValue(item, key) ?? '');
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

    if (column.type === 'custom' && (column.key === 'status' || column.key === 'gameType')) {
      return getStatusTooltip(String(value));
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
    if (column.type === 'custom' && (column.key === 'status' || column.key === 'gameType')) {
      const value = this.getCellValue(item, column);
      const tooltip = getStatusTooltip(String(value));
      matTooltip.disabled = !tooltip;
      return;
    }

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

  getStatusBadgeStyle(status: unknown): Record<string, string> {
    return getStatusStyle(String(status)) || getStatusStyle(Number(status));
  }

  getStatusLabel(status: unknown): string {
    return (
      STATUS_COLOR[String(status)]?.label || STATUS_COLOR[Number(status)]?.label || String(status)
    );
  }

  getGameTypeBadgeStyle(gameType: unknown): Record<string, string> {
    return getStatusStyle(String(gameType));
  }

  getEntityProfileRoute(item: T): string[] {
    const type = String(this.getCellValueByKey(item, 'type') ?? '');
    const entityId = String(this.getCellValueByKey(item, 'entityId') ?? '');
    switch (type) {
      case 'player':
        return ['/teams-and-rosters/players', entityId, 'profile'];
      case 'goalie':
        return ['/teams-and-rosters/goalies', entityId, 'profile'];
      case 'team':
        return ['/teams-and-rosters/teams', entityId, 'profile'];
      case 'game':
        return ['/schedule/live', entityId];
      default:
        return ['/'];
    }
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

  private readonly colorMap: Record<string, AppColor> = {
    red: 'primary',
    green: 'green',
    blue: 'cyan',
    orange: 'orange',
    purple: 'purple',
    gray: 'text_secondary',
  };

  private readonly colorHoverMap: Record<string, AppColor> = {
    red: 'primary_dark',
    green: 'green_dark',
    blue: 'cyan_dark',
    orange: 'orange_dark',
    purple: 'purple_dark',
    gray: 'text_primary',
  };

  getActionColor(variant?: string): AppColor {
    return this.colorMap[variant ?? 'gray'] ?? 'text_secondary';
  }

  getActionColorHover(variant?: string): AppColor {
    return this.colorHoverMap[variant ?? 'gray'] ?? 'text_primary';
  }

  getActionTooltip(action: TableAction, element: Record<string, unknown>): string | null {
    if (action.tooltip) {
      const value = typeof action.tooltip === 'function' ? action.tooltip(element) : action.tooltip;
      if (value) return value;
    }
    return action.iconOnly ? action.label : null;
  }
}
