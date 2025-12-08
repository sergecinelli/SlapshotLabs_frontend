import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-content">
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <p class="text-custom-secondary">This feature will be implemented in the future.</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './analytics.scss',
})
export class AnalyticsComponent {}
