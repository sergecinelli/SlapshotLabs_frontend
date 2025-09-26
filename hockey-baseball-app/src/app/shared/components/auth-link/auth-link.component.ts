import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-auth-link',
  standalone: true,
  imports: [],
  templateUrl: './auth-link.component.html',
  styleUrl: './auth-link.component.scss'
})
export class AuthLinkComponent {
  @Input() text: string = '';
  @Input() linkText: string = '';
  
  @Output() linkClicked = new EventEmitter<void>();

  onLinkClick(): void {
    this.linkClicked.emit();
  }
}