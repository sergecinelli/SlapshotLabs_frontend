import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-auth-button',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './auth-button.component.html',
  styleUrl: './auth-button.component.scss'
})
export class AuthButtonComponent {
  @Input() text: string = '';
  @Input() type: 'submit' | 'button' = 'button';
  @Input() disabled: boolean = false;
  @Input() variant: 'filled' | 'outlined' = 'filled';
  @Input() loading: boolean = false;
  @Input() loadingText: string = 'Loading...';
  
  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit();
    }
  }
}