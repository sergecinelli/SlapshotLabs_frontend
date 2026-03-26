declare module 'braintree-web-drop-in' {
  interface DropinCardOverrides {
    fields?: Record<string, Record<string, unknown>>;
    styles?: Record<string, Record<string, string>>;
  }

  interface DropinCardOptions {
    cardholderName?: { required: boolean };
    overrides?: DropinCardOverrides;
  }

  interface DropinPayPalOptions {
    flow: 'vault' | 'checkout';
    amount?: string;
    currency?: string;
    buttonStyle?: Record<string, string>;
  }

  interface DropinCreateOptions {
    authorization: string;
    container: string | HTMLElement;
    locale?: string;
    translations?: Record<string, string>;
    vaultManager?: boolean;
    card?: DropinCardOptions;
    paypal?: DropinPayPalOptions;
  }

  interface DropinPaymentMethodPayload {
    nonce: string;
    type: string;
    details: Record<string, unknown>;
  }

  interface DropinInstance {
    requestPaymentMethod(): Promise<DropinPaymentMethodPayload>;
    teardown(): Promise<void>;
    isPaymentMethodRequestable(): boolean;
    clearSelectedPaymentMethod(): void;
    on(
      event: 'paymentMethodRequestable' | 'noPaymentMethodRequestable' | 'paymentOptionSelected',
      handler: (payload?: Record<string, unknown>) => void
    ): void;
  }

  function create(options: DropinCreateOptions): Promise<DropinInstance>;
}
