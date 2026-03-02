import { Component, input } from '@angular/core';
import { NgStyle } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';
import { ComponentDisableToggleDirective } from '../../../directives/component-disable-toggle.directive';

@Component({
  selector: 'app-button-loading',
  imports: [NgStyle, MatRippleModule, MatTooltipModule, ComponentDisableToggleDirective],
  templateUrl: './button-loading.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonLoadingComponent extends ButtonBaseClass {
  type = input<'button' | 'submit'>('button');
  isLoading = input(false);

  override click(event: MouseEvent) {
    if (this.isLoading() || this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (this.type() !== 'submit') {
      event.preventDefault();
      event.stopPropagation();
    }
    this.clicked.emit(event);
  }
}
