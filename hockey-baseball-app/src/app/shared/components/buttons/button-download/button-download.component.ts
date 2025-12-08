import { Component, HostBinding, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-download',
  standalone: true,
  imports: [CommonModule, MatRippleModule, MatTooltipModule],
  templateUrl: './button-download.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonDownloadComponent extends ButtonBaseClass {
  @Input() maxWidth: string | number = 'auto';
  @Input() download = '';

  @HostBinding('style.max-width')
  get getMaxWidth(): string {
    return typeof this.maxWidth === 'number'
      ? `${this.maxWidth}px`
      : this.maxWidth;
  }
}

