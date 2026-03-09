import { Component, input, inject, ElementRef, afterRenderEffect } from '@angular/core';

@Component({
  selector: 'app-card-grid',
  templateUrl: './card-grid.component.html',
  styleUrl: './card-grid.component.scss',
  host: {
    '[style.display]': '"grid"',
    '[style.grid-template-columns]': '"repeat(" + columns() + ", 1fr)"',
    '[style.gap.px]': 'gap()',
    '[style.--grid-radius.px]': 'radius()',
  },
})
export class CardGridComponent {
  columns = input(2);
  gap = input(3);
  radius = input(10);

  private el = inject(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.applyBorderRadius();

      const observer = new MutationObserver(() => this.applyBorderRadius());
      observer.observe(this.el.nativeElement, { childList: true });

      return () => observer.disconnect();
    });
  }

  private applyBorderRadius(): void {
    const cols = this.columns();
    const items = Array.from(this.el.nativeElement.children) as HTMLElement[];
    const total = items.length;

    if (total === 0) return;

    const rows = Math.ceil(total / cols);

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const isLastInRow = col === cols - 1 || i === total - 1;

      const tl = row === 0 && col === 0 ? 'var(--grid-radius)' : 'var(--radius-small)';
      const tr = row === 0 && isLastInRow ? 'var(--grid-radius)' : 'var(--radius-small)';
      const br = i === total - 1 ? 'var(--grid-radius)' : 'var(--radius-small)';
      const bl = row === rows - 1 && col === 0 ? 'var(--grid-radius)' : 'var(--radius-small)';

      items[i].style.borderRadius = `${tl} ${tr} ${br} ${bl}`;
    }
  }
}
