import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ButtonBaseClass } from '../button-base.class';
import { ComponentDisableToggleDirective } from '../../../directives/component-disable-toggle.directive';

@Component({
  selector: 'app-button-loading',
  standalone: true,
  imports: [CommonModule, MatRippleModule, MatTooltipModule, ComponentDisableToggleDirective],
  templateUrl: './button-loading.component.html',
  styleUrl: '../button.component.scss',
})
export class ButtonLoadingComponent extends ButtonBaseClass {
  @Input() type: 'button' | 'submit' = 'button';
  @Input() isLoading = false;

  override click(event: MouseEvent) {
    if (this.isLoading || this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // For submit buttons, don't prevent default to allow form submission
    if (this.type !== 'submit') {
      event.preventDefault();
      event.stopPropagation();
    }
    this.clicked.emit();
  }
}

