import { Component, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-clickable-text',
  template: `<span class="clickable-text" (click)="clicked.emit($event)"
    ><ng-content></ng-content
  ></span>`,
  styleUrl: './clickable-text.component.scss',
  host: {
    '[style.font-size]': 'fontSize()',
    '[style.font-weight]': 'fontWeight()',
    '[style.color]': 'cssColor()',
  },
})
export class ClickableTextComponent {
  fontSize = input<string | null>(null);
  fontWeight = input<string | null>(null);
  color = input<string | null>(null);

  clicked = output<MouseEvent>();

  protected cssColor = computed(() => {
    const c = this.color();
    return c ? `var(--${c.replaceAll('_', '-')})` : null;
  });
}
