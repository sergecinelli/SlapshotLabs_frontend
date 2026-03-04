import { Component, input } from '@angular/core';

@Component({
  selector: 'app-card-grid',
  templateUrl: './card-grid.component.html',
  styleUrl: './card-grid.component.scss',
  host: {
    '[style.--grid-columns]': 'columns()',
    '[style.--grid-radius.px]': 'radius()',
    '[attr.data-columns]': 'columns()',
  },
})
export class CardGridComponent {
  columns = input(2);
  radius = input(20);
}
