import { Component, OnInit, inject, signal, computed } from '@angular/core';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../../shared/components/data-table/data-table.component';
import { PaymentService } from '../../../services/payment.service';
import { Transaction } from '../../../shared/interfaces/payment.interface';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { DEFAULT_PAGE_SIZE } from '../../../shared/constants/pagination.constants';

@Component({
  selector: 'app-payment-history',
  imports: [DataTableComponent, CurrencyFormatPipe, LoadingSpinnerComponent, PaginationComponent],
  templateUrl: './payment-history.page.html',
  styleUrl: './payment-history.page.scss',
})
export class PaymentHistoryPage implements OnInit {
  private paymentService = inject(PaymentService);
  private currencyPipe = new CurrencyFormatPipe();

  transactions = signal<Transaction[]>([]);
  isLoading = signal(true);

  currentPage = signal(1);
  totalPages = signal(0);
  totalCount = signal(0);

  totalPaid = computed(() => {
    return this.transactions().reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  });

  averageAmount = computed(() => {
    const total = this.totalCount();
    return total > 0 ? this.totalPaid() / total : 0;
  });

  readonly columns: TableColumn[] = [
    { key: 'date', label: 'Date', type: 'date', sortable: true },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'text', align: 'right' },
    { key: 'status', label: 'Status', type: 'custom', align: 'center' },
  ];

  readonly actions: TableAction[] = [
    { label: 'Download', icon: 'download', action: 'download', variant: 'orange', iconOnly: true },
    { label: 'View', icon: 'visibility', action: 'view', variant: 'gray', iconOnly: true },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.paymentService.getPaymentHistory(this.currentPage(), DEFAULT_PAGE_SIZE).subscribe({
      next: (response) => {
        this.totalPages.set(response.total_pages);
        this.totalCount.set(response.count);
        this.transactions.set(
          response.items.map((t) => ({
            ...t,
            amount: this.currencyPipe.transform(t.amount),
          }))
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onActionClick(event: { action: string; item: Record<string, unknown> }): void {
    console.log('Action:', event.action, 'Item:', event.item);
  }
}
