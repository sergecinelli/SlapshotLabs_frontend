import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-auth-button',
  imports: [MatButtonModule],
  templateUrl: './auth-button.component.html',
  styleUrl: './auth-button.component.scss',
})
export class AuthButtonComponent {
  text = input('');
  type = input<'submit' | 'button'>('button');
  disabled = input(false);
  variant = input<'filled' | 'outlined'>('filled');
  loading = input(false);
  loadingText = input('Loading...');

  clicked = output<void>();

  onClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit();
    }
  }
}
