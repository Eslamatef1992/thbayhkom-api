import axios from 'axios';
import { config } from '../config';

export interface PaymentResult {
  requiresRedirect: boolean;
  url?: string;
  paymentId?: string;
  paymentStatus: number;
}

export interface PaymentAdapter {
  createPayment(order: any, paymentMethod: number, lang: 'en' | 'ar'): Promise<PaymentResult>;
}

class CashOnDeliveryAdapter implements PaymentAdapter {
  async createPayment(): Promise<PaymentResult> {
    return { requiresRedirect: false, paymentStatus: 0 };
  }
}

class UPaymentsAdapter implements PaymentAdapter {
  private readonly sandboxUrl = 'https://sandboxapi.upayments.com/api/v1/charge';
  private readonly liveUrl    = 'https://api.upayments.com/api/v1/charge';
  private get isSandbox() { return process.env.UPAYMENTS_SANDBOX !== 'false'; }
  // The fallback is UPayments' public sandbox test key; live mode requires UPAYMENTS_API_KEY.
  get key() { return this.apiKey; }
  private get apiKey()    {
    const key = process.env.UPAYMENTS_API_KEY;
    if (key) return key;
    if (this.isSandbox) return 'NWty8gdjt79cf756hdtyu6u8jht5ns6gfhgy8hdjL';
    throw new Error('UPAYMENTS_API_KEY is required when UPAYMENTS_SANDBOX=false');
  }

  private methodSrc(method: number): string {
    if (method === 2) return 'cc';
    if (method === 4) return 'sadad';
    return 'knet';
  }

  get baseUrl() { return this.isSandbox ? 'https://sandboxapi.upayments.com/api/v1' : 'https://api.upayments.com/api/v1'; }

  async createPayment(order: any, method: number, lang: 'en' | 'ar'): Promise<PaymentResult> {
    const url = this.isSandbox ? this.sandboxUrl : this.liveUrl;
    const failUrl = config.payment.failUrl.replace('{lang}', lang);
    // UPayments redirects/notifies the backend, which verifies the payment and then
    // redirects to the success/fail page the app's WebView watches for.
    const api = `${config.publicApiUrl}${config.apiBasePath}`;
    const qs = `oid=${order.id}&lang=${lang}`;

    try {
      const response = await axios.post(url, {
        order: {
          id:          String(order.id),
          reference:   `order-${order.id}`,
          description: `Thabayehkom Order #${order.id}`,
          currency:    'KWD',
          amount:      Number(order.total_price),
        },
        language:   lang,
        returnUrl:  `${api}/payment/return?${qs}`,
        cancelUrl:  `${api}/payment/cancel?${qs}`,
        notificationUrl: `${api}/payment/webhook?${qs}`,
        paymentGateway: { src: this.methodSrc(method) },
        customer: {
          uniqueId: String(order.user_id || order.id),
          name:     order.name  || 'Customer',
          email:    order.email || 'noreply@thabayehkom.app',
          mobile:   order.mobile || '',
        },
        isSaveCard:    false,
        isWhiteLabeled: false,
      }, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const data = response.data;
      const payUrl  = data?.data?.link || data?.link || data?.paymentURL || failUrl;
      const trackId = data?.data?.trackId || data?.trackId || String(order.id);

      return { requiresRedirect: true, url: payUrl, paymentId: trackId, paymentStatus: 0 };
    } catch (err: any) {
      console.error('[uPayments] error:', err?.response?.data || err.message);
      return { requiresRedirect: true, url: `${failUrl}?error=gateway_error`, paymentId: undefined, paymentStatus: 0 };
    }
  }
}

/** Result of asking UPayments for the real status of a transaction. */
export interface VerifiedPayment {
  paid: boolean;
  /** true when UPayments reports a final non-captured state (failed/cancelled/expired). */
  final: boolean;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  raw: any;
}

/** Find the first value for any of `keys` anywhere in a nested JSON object. */
function deepFind(obj: any, keys: string[], depth = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 5) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  for (const v of Object.values(obj)) {
    const found = deepFind(v, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Checks a transaction with UPayments' get-payment-status API (never trust the callback alone). */
export async function verifyUPayment(trackId: string): Promise<VerifiedPayment> {
  try {
    const res = await axios.get(`${online.baseUrl}/get-payment-status/${encodeURIComponent(trackId)}`, {
      headers: { Authorization: `Bearer ${online.key}`, Accept: 'application/json' },
      timeout: 15000,
    });
    const raw = res.data;
    const result = String(deepFind(raw, ['result', 'status_result', 'transaction_status']) ?? '').toUpperCase();
    const paid = result === 'CAPTURED' || result === 'SUCCESS' || result === 'PAID';
    const amountRaw = deepFind(raw, ['total_price', 'amount', 'total_amount']);
    return {
      paid,
      final: !paid && result !== '' && !['PENDING', 'INITIATED', 'IN PROGRESS'].includes(result),
      orderId: deepFind(raw, ['requested_order_id', 'order_id'])?.toString(),
      transactionId: deepFind(raw, ['tran_id', 'transaction_id', 'payment_id'])?.toString(),
      amount: amountRaw != null && !isNaN(Number(amountRaw)) ? Number(amountRaw) : undefined,
      raw,
    };
  } catch (err: any) {
    console.error('[uPayments] status check failed:', err?.response?.status, err?.response?.data || err.message);
    return { paid: false, final: false, raw: { error: err?.response?.data || err.message } };
  }
}

const cod    = new CashOnDeliveryAdapter();
const online = new UPaymentsAdapter();

export function paymentAdapterFor(method: number): PaymentAdapter {
  return method === 3 ? cod : online;
}
