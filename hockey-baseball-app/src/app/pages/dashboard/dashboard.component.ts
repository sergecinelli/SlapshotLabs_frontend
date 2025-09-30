import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 pt-0">
      <h1 class="text-2xl font-medium text-custom-primary mb-6">Dashboard</h1>
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <p class="text-custom-secondary">This feature will be implemented in the future.</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {}
