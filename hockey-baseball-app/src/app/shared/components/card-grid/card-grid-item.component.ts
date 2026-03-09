import { Component, inject, input, output } from '@angular/core';
import { MatRipple } from '@angular/material/core';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-card-grid-item',
  templateUrl: './card-grid-item.component.html',
  styleUrl: './card-grid-item.component.scss',
  imports: [MatRipple],
  host: {
    role: 'button',
    '[class.selected]': 'selected()',
    '(click)': 'select.emit()',
  },
})
export class CardGridItemComponent {
  private themeService = inject(ThemeService);

  selected = input(false);
  select = output<void>();

  get rippleColor() {
    return this.themeService.getRippleColor('text_secondary', 0.05);
  }
}
