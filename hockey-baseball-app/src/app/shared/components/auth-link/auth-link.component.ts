import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-auth-link',
  imports: [],
  templateUrl: './auth-link.component.html',
  styleUrl: './auth-link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLinkComponent {
  text = input('');
  linkText = input('');

  linkClicked = output<void>();

  onLinkClick(): void {
    this.linkClicked.emit();
  }
}
