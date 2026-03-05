import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';

@Component({
  selector: 'app-button-small',
  imports: [NgStyle, MatTooltipModule],
  templateUrl: './button-small.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonSmallComponent extends ButtonBaseClass {
  isLoading = input(false);

  handleKeyboard(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const mouseEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      this.click(mouseEvent);
    }
  }

  override click(event: MouseEvent) {
    if (this.isLoading() || this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.clicked.emit(event);
  }
}
