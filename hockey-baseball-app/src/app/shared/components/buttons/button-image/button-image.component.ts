import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-image',
  standalone: true,
  imports: [CommonModule, MatRippleModule, MatTooltipModule],
  templateUrl: './button-image.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonImageComponent extends ButtonBaseClass {
  @Input() image = '';
  @Input() type: 'button' | 'submit' = 'button';
  @Input() isLoading = false;

  override click(event: MouseEvent) {
    if (this.isLoading) return;

    event.preventDefault();
    event.stopPropagation();
    this.clicked.emit();
  }
}

