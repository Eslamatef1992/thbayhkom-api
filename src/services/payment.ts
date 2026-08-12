import { config } from '../config';

export interface PaymentResult {
  requiresRedirect: boolean;
  url?: string;
  paymentId?: string;
  paymentStatus: number; // 0 pending, 1 paid
}

export interface PaymentAdapter {
  /** paymentMethod values: 1 KNET, 2 Credit, 3 COD, 4 SADAD, 5 NAPS */
  createPayment(order: any, paymentMethod: number, lang: 'en' | 'ar'): Promise<PaymentResult>;
}

/** Cash on Delivery: no redirect, immediately "pending" until delivered. */
class CashOnDeliveryAdapter implements PaymentAdapter {
  async createPayment(): Promise<PaymentResult> {
    return { requiresRedirect: false, paymentStatus: 0 };
  }
}

/**
 * Placeholder online gateway. The concrete provider is unknown (docs Q1).
 * Returns a hosted payment URL; the real provider must redirect back to
 * PAYMENT_SUCCESS_URL/PAYMENT_FAIL_URL with a transaction_id on success.
 * Until a provider is wired, this builds a mock URL so the app flow is testable.
 */
class OnlineGatewayAdapter implements PaymentAdapter {
  async createPayment(order: any, _method: number, lang: 'en' | 'ar'): Promise<PaymentResult> {
    const base = config.payment.successUrl.replace('{lang}', lang);
    // NOTE: Replace with real gateway session creation once provider (Q1) is known.
    const url = `${base}?transaction_id=MOCK-${order.id}-${Date.now()}`;
    return { requiresRedirect: true, url, paymentId: `mock_${order.id}`, paymentStatus: 0 };
  }
}

const cod = new CashOnDeliveryAdapter();
const online = new OnlineGatewayAdapter();

export function paymentAdapterFor(method: number): PaymentAdapter {
  // 3 = Cash on Delivery; everything else routes online.
  return method === 3 ? cod : online;
}
