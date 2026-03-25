import { Component, OnInit, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ModalService, ModalEvent } from '../../../services/modal.service';
import { PaymentService } from '../../../services/payment.service';
import { ButtonComponent } from '../buttons/button/button.component';
import { ButtonLoadingComponent } from '../buttons/button-loading/button-loading.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { DropinInstance } from 'braintree-web-drop-in';

@Component({
  selector: 'app-add-payment-modal',
  imports: [ButtonComponent, ButtonLoadingComponent, LoadingSpinnerComponent],
  templateUrl: './add-payment.modal.html',
  styleUrl: './add-payment.modal.scss',
})
export class AddPaymentModal implements OnInit {
  private modalService = inject(ModalService);
  private paymentService = inject(PaymentService);

  @ViewChild('dropinContainer', { static: true }) dropinContainer!: ElementRef<HTMLDivElement>;

  isLoadingDropin = signal(true);
  isSubmitting = signal(false);
  isPaymentReady = signal(false);
  dropinError = signal<string | null>(null);

  private dropinInstance: DropinInstance | null = null;

  constructor() {
    this.modalService.onEvent$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event === ModalEvent.StopButtonLoading) {
        this.isSubmitting.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.initializeDropin();
  }

  private async initializeDropin(): Promise<void> {
    try {
      const { client_token } = await firstValueFrom(this.paymentService.getClientToken());
      const dropin = await import('braintree-web-drop-in');
      this.dropinInstance = await dropin.create({
        authorization: client_token,
        container: this.dropinContainer.nativeElement,
        vaultManager: true,
      });
      this.dropinInstance.on('paymentMethodRequestable', () => this.isPaymentReady.set(true));
      this.dropinInstance.on('noPaymentMethodRequestable', () => this.isPaymentReady.set(false));
      this.isLoadingDropin.set(false);
    } catch {
      this.dropinError.set('Failed to initialize payment form. Please try again.');
      this.isLoadingDropin.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.dropinInstance) {
      this.dropinError.set('Payment form not ready. Please wait.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { nonce } = await this.dropinInstance.requestPaymentMethod();
      this.modalService.closeWithDataProcessing({ nonce });
    } catch {
      this.dropinInstance?.clearSelectedPaymentMethod();
      this.dropinError.set('Failed to process payment method. Please try again.');
      this.isSubmitting.set(false);
    }
  }

  onCancel(): void {
    this.modalService.closeModal();
  }
}
