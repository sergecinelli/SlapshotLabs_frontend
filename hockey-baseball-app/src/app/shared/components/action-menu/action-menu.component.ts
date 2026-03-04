import { Component, inject, input, output } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { OutsideClickDirective } from '../../directives/outside-click.directive';
import { ComponentDisableToggleDirective } from '../../directives/component-disable-toggle.directive';
import { ThemeService } from '../../../services/theme.service';
import { ActionMenuItem } from './action-menu.interface';

@Component({
  selector: 'app-action-menu',
  templateUrl: './action-menu.component.html',
  styleUrl: './action-menu.component.scss',
  imports: [OutsideClickDirective, ComponentDisableToggleDirective, MatRipple],
})
export class ActionMenuComponent {
  private themeService = inject(ThemeService);

  items = input<ActionMenuItem[]>([]);
  closed = output<void>();

  get rippleColor() {
    return this.themeService.getRippleColor('text_secondary', 0.05);
  }

  handleAction(item: ActionMenuItem, event?: MouseEvent) {
    if (item.onClick) {
      item.onClick(event);
    }
    this.closed.emit();
  }

  outsideClick() {
    this.closed.emit();
  }
}
