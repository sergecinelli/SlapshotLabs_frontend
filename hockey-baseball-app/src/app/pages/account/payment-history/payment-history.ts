import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <div class="p-6 pt-0">
      <app-page-header title="Payment History"></app-page-header>
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <p class="text-custom-secondary">This feature will be implemented in the future.</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './payment-history.scss'
})
export class PaymentHistoryComponent {}
