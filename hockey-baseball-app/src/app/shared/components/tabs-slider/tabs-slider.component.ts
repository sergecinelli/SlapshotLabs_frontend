import { Component, effect, input, output, viewChildren, ElementRef, signal } from '@angular/core';
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
  private tabElements = viewChildren<ElementRef>('tabItem');

  protected currentTabIndex = signal(0);
  protected indicatorLeft = signal(0);
  protected indicatorWidth = signal(0);

  items = input<TabItem[]>([]);
  activeTabIndex = input<number | null>(null);

  selected = output<string>();

  private canSelect = true;

  constructor() {
    effect(() => {
      const activeIndex = this.activeTabIndex();
      if (activeIndex !== undefined && activeIndex !== null) {
        this.currentTabIndex.set(activeIndex);
      }
    });

    effect(() => {
      const tabs = this.tabElements();
      const index = this.currentTabIndex();
      requestAnimationFrame(() => {
        if (tabs.length > 0 && tabs[index]) {
          const el = tabs[index].nativeElement;
          this.indicatorLeft.set(el.offsetLeft);
          this.indicatorWidth.set(el.offsetWidth);
        }
      });
    });
  }

  selectTab(index: number) {
    if (!this.canSelect) return;
    this.canSelect = false;
    setTimeout(() => (this.canSelect = true), 300);

    this.currentTabIndex.set(index);
    this.selected.emit(this.items()[index].key);
  }
}
