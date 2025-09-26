import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [MatCardModule, MatDivider],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss'
})
export class AuthLayoutComponent {
  @Input() title: string = '';
}