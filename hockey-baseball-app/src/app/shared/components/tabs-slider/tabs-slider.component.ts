import { Component, effect, input, output } from '@angular/core';
import { MatRippleModule } from '@angular/material/core';

export interface TabItem {
  key: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-tabs-slider',
  imports: [MatRippleModule],
  templateUrl: './tabs-slider.component.html',
  styleUrl: './tabs-slider.component.scss',
})
export class TabsSliderComponent {
  protected currentTabIndex = 0;
  protected readonly rippleColor = 'rgba(0, 0, 0, 0.05)';

  items = input<TabItem[]>([]);
  activeTabIndex = input<number | null>(null);

  onSelect = output<string>();

  private canSelect = true;

  constructor() {
    effect(() => {
      const activeIndex = this.activeTabIndex();
      if (activeIndex !== undefined && activeIndex !== null) {
        this.currentTabIndex = activeIndex;
      }
    });
  }

  selectTab(index: number) {
    if (!this.canSelect) return;
    this.canSelect = false;
    setTimeout(() => (this.canSelect = true), 300);

    this.currentTabIndex = index;
    this.onSelect.emit(this.items()[index].key);
  }
}
