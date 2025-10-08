import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [MatCardModule, MatDivider],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss'
})
export class AuthLayoutComponent {
  @Input() titleText: string = '';
}
