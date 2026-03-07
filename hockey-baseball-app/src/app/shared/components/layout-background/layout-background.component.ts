import { Component, ViewEncapsulation, inject } from '@angular/core';
import { LayoutBackgroundService } from '../../../services/layout-background.service';

@Component({
  selector: 'app-layout-background',
  template: `
    @if (layoutBg.dotsBg()) {
      <div class="layout-bg" aria-hidden="true">
        <div class="layout-bg__ice"></div>
        <div class="layout-bg__scratches"></div>
        <div class="layout-bg__sheen"></div>
      </div>
    }
  `,
  styleUrl: './layout-background.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'layout-background' },
})
export class LayoutBackgroundComponent {
  protected layoutBg = inject(LayoutBackgroundService);
}
