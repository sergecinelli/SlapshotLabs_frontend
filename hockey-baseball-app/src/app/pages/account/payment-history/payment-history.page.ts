import { Component, OnInit, inject, signal, computed } from '@angular/core';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../../shared/components/data-table/data-table.component';
import { PaymentService } from '../../../services/payment.service';
import { Transaction } from '../../../shared/interfaces/payment.interface';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-payment-history',
  imports: [DataTableComponent, CurrencyFormatPipe],
  templateUrl: './payment-history.page.html',
  styleUrl: './payment-history.page.scss',
})
export class PaymentHistoryPage implements OnInit {
  private paymentService = inject(PaymentService);
  private currencyPipe = new CurrencyFormatPipe();

  rawTransactions = signal<Transaction[]>([]);
  transactions = signal<Transaction[]>([]);
  isLoading = signal(true);

  totalTransactions = computed(() => this.rawTransactions().length);

  totalPaid = computed(() => {
    return this.rawTransactions().reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
  });

  averageAmount = computed(() => {
    const total = this.totalTransactions();
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

  private loadData(): void {
    this.paymentService.getPaymentHistory().subscribe({
      next: (transactions) => {
        this.rawTransactions.set(transactions);
        this.transactions.set(
          transactions.map((t) => ({
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
