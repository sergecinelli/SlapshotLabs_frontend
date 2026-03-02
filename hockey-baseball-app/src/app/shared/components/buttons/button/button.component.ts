import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';
import { ComponentDisableToggleDirective } from '../../../directives/component-disable-toggle.directive';

@Component({
  selector: 'app-button',
  imports: [NgStyle, MatRippleModule, MatTooltipModule, ComponentDisableToggleDirective],
  templateUrl: './button.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonComponent extends ButtonBaseClass {
  type = input<'button' | 'submit'>('button');

  override click(event: MouseEvent) {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.clicked.emit(event);
  }
}
