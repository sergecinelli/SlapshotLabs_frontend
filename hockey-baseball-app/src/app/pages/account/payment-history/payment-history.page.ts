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

  rawTransactions = signal<Transaction[]>([]);
  transactions = signal<Transaction[]>([]);
  isLoading = signal(true);
  loadingReceipts = signal<Set<string>>(new Set());

  currentPage = signal(1);
  totalPages = signal(0);
  totalCount = signal(0);

  totalPaid = computed(() => {
    return this.rawTransactions().reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  });

  averageAmount = computed(() => {
    const count = this.rawTransactions().length;
    return count > 0 ? this.totalPaid() / count : 0;
  });

  readonly columns: TableColumn[] = [
    { key: 'date', label: 'Date', type: 'date', sortable: true },
    { key: 'description', label: 'Description', type: 'text' },
    { key: 'amount', label: 'Amount', type: 'text', align: 'right' },
    { key: 'status', label: 'Status', type: 'custom', align: 'center' },
  ];

  readonly actions: TableAction[] = [
    {
      label: 'Download',
      icon: 'download',
      action: 'download',
      variant: 'orange',
      iconOnly: true,
      handler: (item) => this.downloadReceipt(item['id'] as string),
      isLoading: (item) => this.loadingReceipts().has(`download_${item['id']}`),
    },
    {
      label: 'View',
      icon: 'visibility',
      action: 'view',
      variant: 'gray',
      iconOnly: true,
      handler: (item) => this.viewReceipt(item['id'] as string),
      isLoading: (item) => this.loadingReceipts().has(`view_${item['id']}`),
    },
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
        this.rawTransactions.set(response.items);
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

  private downloadReceipt(transactionId: string): void {
    if (!transactionId) return;
    this.setReceiptLoading(`download_${transactionId}`, true);
    this.paymentService.getPaymentReceipt(transactionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt_${transactionId}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.setReceiptLoading(`download_${transactionId}`, false);
      },
      error: () => this.setReceiptLoading(`download_${transactionId}`, false),
    });
  }

  private viewReceipt(transactionId: string): void {
    if (!transactionId) return;
    this.setReceiptLoading(`view_${transactionId}`, true);
    this.paymentService.getPaymentReceipt(transactionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.setReceiptLoading(`view_${transactionId}`, false);
      },
      error: () => this.setReceiptLoading(`view_${transactionId}`, false),
    });
  }

  private setReceiptLoading(key: string, loading: boolean): void {
    const updated = new Set(this.loadingReceipts());
    if (loading) {
      updated.add(key);
    } else {
      updated.delete(key);
    }
    this.loadingReceipts.set(updated);
  }
}
