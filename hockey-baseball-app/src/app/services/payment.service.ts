import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  SubscriptionPlan,
  SubscriptionInfo,
  PaymentMethod,
  Transaction,
  BraintreeClientTokenResponse,
  SubscribeRequest,
  MessageResponse,
} from '../shared/interfaces/payment.interface';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private apiService = inject(ApiService);

  getClientToken(): Observable<BraintreeClientTokenResponse> {
    return this.apiService.get<BraintreeClientTokenResponse>('/users/braintree-client-token');
  }

  getSubscriptionPlans(): Observable<SubscriptionPlan[]> {
    return this.apiService.get<SubscriptionPlan[]>('/users/subscription-plans');
  }

  subscribe(request: SubscribeRequest): Observable<MessageResponse> {
    return this.apiService.post<MessageResponse>('/users/subscribe', request);
  }

  unsubscribe(): Observable<MessageResponse> {
    return this.apiService.post<MessageResponse>('/users/unsubscribe', {});
  }

  getSubscription(): Observable<SubscriptionInfo | null> {
    return this.apiService
      .get<SubscriptionInfo | MessageResponse>('/users/subscription')
      .pipe(
        map((res) => ('message' in res && !('name' in res) ? null : (res as SubscriptionInfo)))
      );
  }

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.apiService.get<PaymentMethod[]>('/users/payment-methods');
  }

  setDefaultPaymentMethod(paymentMethodToken: string): Observable<MessageResponse> {
    return this.apiService.post<MessageResponse>('/users/payment-methods/set-default', {
      payment_method_token: paymentMethodToken,
    });
  }

  getPaymentHistory(): Observable<Transaction[]> {
    return this.apiService.get<Transaction[]>('/users/payment-history');
  }
}
