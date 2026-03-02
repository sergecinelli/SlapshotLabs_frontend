import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-action-button',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './action-button.component.html',
  styleUrl: './action-button.component.scss',
})
export class ActionButtonComponent {
  label = input.required<string>();
  disabled = input(false);
  roleVisibilityName = input<string | undefined>();
  buttonClick = output<void>();

  onClick(): void {
    if (!this.disabled()) {
      this.buttonClick.emit();
    }
  }
}
