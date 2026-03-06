import { Component, contentChild, input, output, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface IListItem {
  key: string | number;
  name: string;
  description?: string;
  icon?: string;
  value?: string;
  valueSuffix?: string;
  disabled?: boolean;
  data?: unknown;
}

@Component({
  selector: 'app-list',
  imports: [NgTemplateOutlet],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent {
  items = input.required<IListItem[]>();
  title = input<string>();
  clickable = input(false);
  alignTop = input(false);

  onItemClick = output<IListItem>();

  contentTemplate = contentChild<TemplateRef<unknown>>('content');
  suffixTemplate = contentChild<TemplateRef<unknown>>('suffix');

  protected onClick(item: IListItem): void {
    if (!this.clickable() || item.disabled) return;
    this.onItemClick.emit(item);
  }
}
