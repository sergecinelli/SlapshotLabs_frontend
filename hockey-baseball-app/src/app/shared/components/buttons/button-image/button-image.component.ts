import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-image',
  imports: [NgStyle, MatRippleModule, MatTooltipModule],
  templateUrl: './button-image.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonImageComponent extends ButtonBaseClass {
  image = input('');
  type = input<'button' | 'submit'>('button');
  isLoading = input(false);

  override click(event: MouseEvent) {
    if (this.isLoading()) return;

    event.preventDefault();
    event.stopPropagation();
    this.clicked.emit(event);
  }
}
