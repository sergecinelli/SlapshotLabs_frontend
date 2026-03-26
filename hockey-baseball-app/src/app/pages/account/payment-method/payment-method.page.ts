import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/buttons/button/button.component';
import { ButtonRouteComponent } from '../../../shared/components/buttons/button-route/button-route.component';
import { ButtonLoadingComponent } from '../../../shared/components/buttons/button-loading/button-loading.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { PaymentService } from '../../../services/payment.service';
import { SubscriptionInfo, PaymentMethod } from '../../../shared/interfaces/payment.interface';
import { AddPaymentModal } from '../../../shared/components/add-payment-modal/add-payment.modal';
import { DisplayTextModal } from '../../../shared/components/display-text-modal/display-text.modal';
import { ToastService } from '../../../services/toast.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import {
  getStatusStyle,
  getStatusTooltip,
  STATUS_TOOLTIP_DELAY,
} from '../../../shared/constants/statuses.constants';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-payment-method',
  imports: [
    ButtonComponent,
    ButtonRouteComponent,
    ButtonLoadingComponent,
    LoadingSpinnerComponent,
    CurrencyFormatPipe,
    MatTooltipModule,
  ],
  templateUrl: './payment-method.page.html',
  styleUrl: './payment-method.page.scss',
})
export class PaymentMethodPage implements OnInit {
  private paymentService = inject(PaymentService);
  private modalService = inject(ModalService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  subscription = signal<SubscriptionInfo | null>(null);
  paymentMethods = signal<PaymentMethod[]>([]);
  isLoading = signal(true);
  activeCardIndex = signal(0);
  slideDirection = signal<'left' | 'right' | null>(null);
  isAnimating = signal(false);
  isAddingCard = signal(false);
  isSettingDefault = signal(false);

  activeCard = computed(() => {
    const methods = this.paymentMethods();
    const index = this.activeCardIndex();
    return methods.length > 0 ? methods[index] : null;
  });

  hasMultipleCards = computed(() => this.paymentMethods().length > 1);
  hasCards = computed(() => this.paymentMethods().length > 0);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    forkJoin({
      subscription: this.paymentService.getSubscription().pipe(catchError(() => of(null))),
      methods: this.paymentService.getPaymentMethods().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ subscription, methods }) => {
        this.subscription.set(subscription);
        this.paymentMethods.set(methods);
        this.isLoading.set(false);
      },
    });
  }

  onPrevCard(): void {
    if (this.isAnimating()) return;
    const current = this.activeCardIndex();
    const total = this.paymentMethods().length;
    this.animateToCard((current - 1 + total) % total, 'right');
  }

  onNextCard(): void {
    if (this.isAnimating()) return;
    const current = this.activeCardIndex();
    const total = this.paymentMethods().length;
    this.animateToCard((current + 1) % total, 'left');
  }

  onSelectCard(index: number): void {
    if (this.isAnimating() || index === this.activeCardIndex()) return;
    const direction = index > this.activeCardIndex() ? 'left' : 'right';
    this.animateToCard(index, direction);
  }

  private animateToCard(index: number, direction: 'left' | 'right'): void {
    this.isAnimating.set(true);
    this.slideDirection.set(direction);

    setTimeout(() => {
      this.activeCardIndex.set(index);
      this.slideDirection.set(null);

      setTimeout(() => {
        this.isAnimating.set(false);
      }, 200);
    }, 150);
  }

  async onAddCard(): Promise<void> {
    await this.modalService.openModal(AddPaymentModal, {
      name: 'Add Payment Method',
      icon: 'credit_card',
      width: '520px',
      onClose: () => this.refreshPaymentMethods(),
      onCloseWithDataProcessing: async () => {
        this.isAddingCard.set(true);
        this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
        this.modalService.closeModal();
        try {
          const methods = await firstValueFrom(this.paymentService.getPaymentMethods());
          this.paymentMethods.set(methods);
          this.activeCardIndex.set(methods.length - 1);
        } finally {
          this.isAddingCard.set(false);
        }
      },
    });
  }

  private async refreshPaymentMethods(): Promise<void> {
    try {
      const methods = await firstValueFrom(this.paymentService.getPaymentMethods());
      this.paymentMethods.set(methods);
      const index = this.activeCardIndex();
      if (index >= methods.length) {
        this.activeCardIndex.set(Math.max(0, methods.length - 1));
      }
    } catch {
      // silent — card list stays as-is
    }
  }

  onSetPrimary(): void {
    const card = this.activeCard();
    if (!card) return;

    this.isSettingDefault.set(true);
    this.paymentService.setDefaultPaymentMethod(card.token).subscribe({
      next: () => {
        const methods = this.paymentMethods().map((m) => ({
          ...m,
          is_default: m.token === card.token,
        }));
        this.paymentMethods.set(methods);
        this.isSettingDefault.set(false);
        this.toastService.show('Default payment method updated', 'success');
      },
      error: (err: { error?: { message?: string } }) => {
        this.isSettingDefault.set(false);
        const message = err.error?.message || 'Failed to set default payment method';
        this.toastService.show(message, 'error');
      },
    });
  }

  onUpgradePlan(): void {
    this.router.navigate(['/account/subscription-plans']);
  }

  onCancelSubscription(): void {
    const planName = this.subscription()?.name ?? 'your subscription';
    this.modalService.openModal(DisplayTextModal, {
      name: 'Cancel Subscription',
      icon: 'cancel',
      data: {
        text: `Are you sure you want to cancel <b>${planName}</b>?\nYou will lose access to all plan features at the end of your billing period.`,
        buttonText: 'Cancel Subscription',
        buttonIcon: 'cancel',
        color: 'primary',
        colorSoft: 'primary_dark',
        withButtonLoading: true,
      },
      onCloseWithDataProcessing: () => {
        this.paymentService.unsubscribe().subscribe({
          next: async () => {
            const subscription = await firstValueFrom(
              this.paymentService.getSubscription().pipe(catchError(() => of(null)))
            );
            this.subscription.set(subscription);
            this.modalService.closeModal();
            this.toastService.show('Subscription cancelled successfully', 'success');
          },
          error: (err: { error?: { message?: string } }) => {
            this.modalService.broadcastEvent(ModalEvent.StopButtonLoading);
            const message = err.error?.message || 'Failed to cancel subscription';
            this.toastService.show(message, 'error');
          },
        });
      },
    });
  }

  formatExpiry(expiration: string): string {
    return expiration;
  }

  formatCardDisplay(display: string): string {
    return display;
  }

  readonly tooltipDelay = STATUS_TOOLTIP_DELAY;

  getStatusBadgeStyle(status: string): Record<string, string> {
    return getStatusStyle(status);
  }

  getStatusTooltipText(status: string): string {
    return getStatusTooltip(status);
  }
}
