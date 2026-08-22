import type { PaymentIntent, PaymentMethod, Money, Quote } from "./domain";

export type CreatePaymentIntentInput = {
  merchantId: string;
  locationId: string;
  orderId: string;
  idempotencyKey: string;
  displayAmount: Money;
  paymentMethod: PaymentMethod;
  paymentAsset?: string;
};

export interface QuoteProvider {
  quote(input: {
    displayAmount: Money;
    paymentMethod: PaymentMethod;
    paymentAsset?: string;
  }): Promise<Quote>;
}

export class PaymentCore {
  constructor(private readonly quoteProvider: QuoteProvider) {}

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntent> {
    const now = new Date().toISOString();
    const quote = await this.quoteProvider.quote({
      displayAmount: input.displayAmount,
      paymentMethod: input.paymentMethod,
      paymentAsset: input.paymentAsset,
    });

    return {
      id: crypto.randomUUID(),
      merchantId: input.merchantId,
      locationId: input.locationId,
      orderId: input.orderId,
      idempotencyKey: input.idempotencyKey,
      displayAmount: input.displayAmount,
      paymentMethod: input.paymentMethod,
      paymentAsset: input.paymentAsset,
      quote,
      status: "quoted",
      createdAt: now,
      updatedAt: now,
    };
  }

  transition(intent: PaymentIntent, next: PaymentIntent["status"]): PaymentIntent {
    const legalTransitions: Record<PaymentIntent["status"], PaymentIntent["status"][]> = {
      created: ["quoted", "cancelled", "failed"],
      quoted: ["awaiting_payment", "expired", "cancelled", "failed"],
      awaiting_payment: ["detected", "expired", "cancelled", "failed"],
      detected: ["confirming", "settled", "failed"],
      confirming: ["settled", "failed"],
      settled: ["refunded"],
      expired: [],
      cancelled: [],
      failed: [],
      refunded: [],
    };

    if (!legalTransitions[intent.status].includes(next)) {
      throw new Error(`Illegal payment transition: ${intent.status} -> ${next}`);
    }

    return {
      ...intent,
      status: next,
      updatedAt: new Date().toISOString(),
    };
  }
}
