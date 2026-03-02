import { Component  } from '@angular/core';
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
}

