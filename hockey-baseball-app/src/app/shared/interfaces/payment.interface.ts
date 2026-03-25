export enum TransactionStatus {
  Paid = 'Paid',
  Failed = 'Failed',
  Pending = 'Pending',
  Refunded = 'Refunded',
}

export enum BraintreeTransactionStatus {
  SubmittedForSettlement = 'submitted_for_settlement',
  Settled = 'settled',
  Settling = 'settling',
  Authorized = 'authorized',
  Authorizing = 'authorizing',
  SettlementPending = 'settlement_pending',
  GatewayRejected = 'gateway_rejected',
  ProcessorDeclined = 'processor_declined',
  Failed = 'failed',
  Voided = 'voided',
}

export enum SubscriptionStatus {
  Active = 'Active',
  Canceled = 'Canceled',
  PastDue = 'Past Due',
  Pending = 'Pending',
  Expired = 'Expired',
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: string;
  features: string[];
  users_count: number;
}

export interface SubscriptionInfo {
  name: string;
  price: string;
  status: string;
  next_billing_date: string;
  users_count: number;
}

export interface PaymentMethod {
  [key: string]: unknown;
  type: string;
  display: string;
  brand: string;
  expiration: string;
  token: string;
  is_default: boolean;
}

export interface Transaction {
  [key: string]: unknown;
  id: string;
  date: string;
  description: string;
  amount: string;
  status: TransactionStatus;
}

export interface BraintreeClientTokenResponse {
  client_token: string;
}

export interface SubscribeRequest {
  plan_id: number;
  payment_method_nonce?: string;
  payment_method_token?: string;
}

export interface MessageResponse {
  message: string;
}
