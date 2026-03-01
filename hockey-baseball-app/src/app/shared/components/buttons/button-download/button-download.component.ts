import { Component, input, computed } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-download',
  imports: [NgStyle, MatRippleModule, MatTooltipModule],
  templateUrl: './button-download.component.html',
  styleUrl: '../button.component.scss',
  host: { '[style.max-width]': 'computedMaxWidth()' },
})
export class ButtonDownloadComponent extends ButtonBaseClass {
  maxWidth = input<string | number>('auto');
  download = input('');

  computedMaxWidth = computed(() => {
    const value = this.maxWidth();
    return typeof value === 'number' ? `${value}px` : value;
  });
}
