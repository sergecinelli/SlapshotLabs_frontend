import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/buttons/button/button.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ModalEvent, ModalService } from '../../../services/modal.service';
import { PaymentService } from '../../../services/payment.service';
import {
  SubscriptionPlan,
  SubscriptionInfo,
  PaymentMethod,
} from '../../../shared/interfaces/payment.interface';
import { SubscribeModal } from '../../../shared/components/subscribe-modal/subscribe.modal';
import { DisplayTextModal } from '../../../shared/components/display-text-modal/display-text.modal';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-subscription-plans',
  imports: [DecimalPipe, ButtonComponent, LoadingSpinnerComponent, CurrencyFormatPipe],
  templateUrl: './subscription-plans.page.html',
  styleUrl: './subscription-plans.page.scss',
})
export class SubscriptionPlansPage implements OnInit {
  private paymentService = inject(PaymentService);
  private modalService = inject(ModalService);
  private toastService = inject(ToastService);

  plans = signal<SubscriptionPlan[]>([]);
  subscription = signal<SubscriptionInfo | null>(null);
  paymentMethods = signal<PaymentMethod[]>([]);
  isLoading = signal(true);
  justActivatedPlanId = signal<number | null>(null);
  previousPlanName = signal<string | null>(null);
  animatedTitle = signal<string | null>(null);
  isTyping = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    forkJoin({
      plans: this.paymentService.getSubscriptionPlans().pipe(catchError(() => of([]))),
      subscription: this.paymentService.getSubscription().pipe(catchError(() => of(null))),
      methods: this.paymentService.getPaymentMethods().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ plans, subscription, methods }) => {
        this.plans.set(plans);
        this.subscription.set(subscription);
        this.paymentMethods.set(methods);
        this.isLoading.set(false);
      },
    });
  }

  async onSelectPlan(plan: SubscriptionPlan, event: Event): Promise<void> {
    const button = (event.target as HTMLElement).closest('.plan-card');
    const rect = button?.getBoundingClientRect();

    await this.modalService.openModal(SubscribeModal, {
      name: 'Subscribe to Plan',
      icon: 'rocket_launch',
      width: '560px',
      preventBackdropClose: true,
      data: {
        plan,
        paymentMethods: this.paymentMethods(),
      },
      onCloseWithDataProcessing: async () => {
        this.modalService.broadcastEvent(1);
        const [methods, subscription, plans] = await Promise.all([
          firstValueFrom(this.paymentService.getPaymentMethods().pipe(catchError(() => of([])))),
          firstValueFrom(this.paymentService.getSubscription().pipe(catchError(() => of(null)))),
          firstValueFrom(this.paymentService.getSubscriptionPlans().pipe(catchError(() => of([])))),
        ]);
        this.paymentMethods.set(methods);
        this.plans.set(plans);
        const oldPlanName = this.subscription()?.name ?? null;
        this.modalService.closeModal();
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (oldPlanName && oldPlanName !== subscription?.name) {
          this.previousPlanName.set(oldPlanName);
          await new Promise((resolve) => setTimeout(resolve, 400));
          this.previousPlanName.set(null);
        }
        this.subscription.set(subscription);
        this.justActivatedPlanId.set(plan.id);
        const confetti = (await import('canvas-confetti')).default;
        const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
        const y = rect ? rect.bottom / window.innerHeight : 0.7;
        confetti({
          particleCount: 65,
          spread: 60,
          origin: { x, y },
          gravity: 1.2,
          ticks: 150,
        });
        this.toastService.show(`Subscribed to ${plan.name}`, 'success');
        setTimeout(() => this.justActivatedPlanId.set(null), 1000);

        if (!oldPlanName) {
          this.typewriterTransition('Choose Your Plan', 'Welcome to the team!');
        }
      },
    });
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
          next: () => {
            this.subscription.set(null);
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

  private async typewriterTransition(oldText: string, newText: string): Promise<void> {
    this.isTyping.set(true);
    this.animatedTitle.set(oldText);

    await new Promise((r) => setTimeout(r, 2000));

    for (let i = oldText.length; i >= 0; i--) {
      this.animatedTitle.set(oldText.substring(0, i));
      await new Promise((r) => setTimeout(r, 30));
    }

    await new Promise((r) => setTimeout(r, 200));

    for (let i = 1; i <= newText.length; i++) {
      this.animatedTitle.set(newText.substring(0, i));
      await new Promise((r) => setTimeout(r, 70));
    }

    this.isTyping.set(false);
    this.animatedTitle.set(null);
  }
}
