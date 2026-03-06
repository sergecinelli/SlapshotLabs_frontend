import { Component, ViewEncapsulation, input } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  imports: [],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'auth-layout' },
})
export class AuthLayoutComponent {
  titleText = input('');
}
