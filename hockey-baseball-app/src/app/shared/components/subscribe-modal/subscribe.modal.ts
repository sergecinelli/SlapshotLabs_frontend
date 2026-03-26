import { Component, OnInit, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { PaymentService } from '../../../services/payment.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SubscriptionPlan, PaymentMethod } from '../../interfaces/payment.interface';
import type { DropinInstance } from 'braintree-web-drop-in';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';

interface SubscribeModalData {
  plan: SubscriptionPlan;
  paymentMethods: PaymentMethod[];
}

@Component({
  selector: 'app-subscribe-modal',
  imports: [ButtonComponent, ButtonLoadingComponent, LoadingSpinnerComponent, CurrencyFormatPipe],
  templateUrl: './subscribe.modal.html',
  styleUrl: './subscribe.modal.scss',
})
export class SubscribeModal implements OnInit {
  private modalService = inject(ModalService);
  private paymentService = inject(PaymentService);

  @ViewChild('dropinContainer', { static: false }) dropinContainer!: ElementRef<HTMLDivElement>;

  plan = signal<SubscriptionPlan | null>(null);
  paymentMethods = signal<PaymentMethod[]>([]);
  selectedMethodToken = signal<string | null>(null);
  useNewCard = signal(false);
  isLoadingDropin = signal(false);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  hasExistingMethods = computed(() => this.paymentMethods().length > 0);
  showDropin = computed(() => this.useNewCard() || !this.hasExistingMethods());

  private dropinInstance: DropinInstance | null = null;

  constructor() {
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    const data = this.modalService.getModalData<SubscribeModalData>();
    if (data) {
      this.plan.set(data.plan);
      this.paymentMethods.set(data.paymentMethods);

      const defaultMethod = data.paymentMethods.find((m) => m.is_default);
      if (defaultMethod) {
        this.selectedMethodToken.set(defaultMethod.token);
      } else if (data.paymentMethods.length > 0) {
        this.selectedMethodToken.set(data.paymentMethods[0].token);
      }

      if (data.paymentMethods.length === 0) {
        this.initializeDropin();
      }
    }
  }

  onSelectMethod(token: string): void {
    this.selectedMethodToken.set(token);
    this.useNewCard.set(false);
    this.error.set(null);
  }

  onUseNewCard(): void {
    this.useNewCard.set(true);
    this.selectedMethodToken.set(null);
    this.error.set(null);

    if (!this.dropinInstance) {
      setTimeout(() => this.initializeDropin(), 0);
    }
  }

  onUseExistingCard(): void {
    this.useNewCard.set(false);
    this.error.set(null);

    const methods = this.paymentMethods();
    const defaultMethod = methods.find((m) => m.is_default);
    this.selectedMethodToken.set(defaultMethod?.token ?? methods[0]?.token ?? null);
  }

  async onSubscribe(): Promise<void> {
    const currentPlan = this.plan();
    if (!currentPlan) return;

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      if (this.showDropin()) {
        if (!this.dropinInstance) {
          this.error.set('Payment form not ready. Please wait.');
          this.isSubmitting.set(false);
          return;
        }

        const { nonce } = await this.dropinInstance.requestPaymentMethod();
        await firstValueFrom(
          this.paymentService.subscribe({
            plan_id: currentPlan.id,
            payment_method_nonce: nonce,
          })
        );
      } else {
        const token = this.selectedMethodToken();
        if (!token) {
          this.error.set('Please select a payment method.');
          this.isSubmitting.set(false);
          return;
        }

        await firstValueFrom(
          this.paymentService.subscribe({
            plan_id: currentPlan.id,
            payment_method_token: token,
          })
        );
      }

      this.modalService.closeWithDataProcessing({ plan: currentPlan });
    } catch {
      this.error.set('Failed to subscribe. Please try again.');
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }

  private async initializeDropin(): Promise<void> {
    this.isLoadingDropin.set(true);

    try {
      const { client_token } = await firstValueFrom(this.paymentService.getClientToken());
      const module = await import('braintree-web-drop-in');
      const dropin = 'default' in module ? (module.default as typeof module) : module;
      this.dropinInstance = await dropin.create({
        authorization: client_token,
        container: this.dropinContainer.nativeElement,
        paypal: { flow: 'vault' },
      });
      this.isLoadingDropin.set(false);
    } catch {
      this.error.set('Failed to initialize payment form. Please try again.');
      this.isLoadingDropin.set(false);
    }
  }
}
