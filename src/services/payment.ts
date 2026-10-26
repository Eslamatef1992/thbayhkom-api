import axios from 'axios';
import { config } from '../config';

export interface PaymentResult {
  requiresRedirect: boolean;
  url?: string;
  paymentId?: string;
  paymentStatus: number;
  /** Set when the gateway refused to create the payment; shown to the customer. */
  error?: string;
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

  /** UPAYMENTS_API_URL overrides it (e.g. https://uapi.upayments.com/api/v1). */
  get baseUrl() {
    const custom = process.env.UPAYMENTS_API_URL?.trim().replace(/\/+$/, '');
    if (custom) return custom;
    return this.isSandbox ? 'https://sandboxapi.upayments.com/api/v1' : 'https://uapi.upayments.com/api/v1';
  }

  async createPayment(order: any, method: number, lang: 'en' | 'ar'): Promise<PaymentResult> {
    const url = `${this.baseUrl}/charge`;
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
        // Required by UPayments (top-level, in addition to order.reference).
        reference: { id: `order-${order.id}` },
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
      const payUrl  = data?.data?.link || data?.link || data?.paymentURL;
      if (!payUrl) {
        console.error('[uPayments] charge returned no payment link:', JSON.stringify(data).slice(0, 2000));
        return { requiresRedirect: true, paymentStatus: 0, error: gatewayMessage(data) };
      }
      const trackId = data?.data?.trackId || data?.trackId || undefined;
      return { requiresRedirect: true, url: payUrl, paymentId: trackId, paymentStatus: 0 };
    } catch (err: any) {
      const body = err?.response?.data;
      console.error(`[uPayments] charge failed (${this.isSandbox ? 'sandbox' : 'LIVE'}, HTTP ${err?.response?.status ?? '-'}):`,
        `${url} ->`, typeof body === 'string' ? body.replace(/\s+/g, ' ').slice(0, 300) : body ? JSON.stringify(body).slice(0, 2000) : err.message);
      return { requiresRedirect: true, paymentStatus: 0, error: gatewayMessage(body) };
    }
  }
}

/** A short, customer-safe reason for a refused charge. */
function gatewayMessage(body: any): string {
  const detail = body?.message || body?.error || '';
  const base = 'The payment page could not be opened. Please try again or choose Cash on Delivery.';
  return detail ? `${base} (${String(detail).slice(0, 160)})` : base;
}

/** Result of asking UPayments for the real status of a transaction. */
export interface VerifiedPayment {
  paid: boolean;
  /** true when UPayments reports a final non-captured state (failed/cancelled/expired). */
  final: boolean;
  /**
   * Our own order references found in the status response (requested_order_id / reference),
   * e.g. ["14", "order-14"]. UPayments' `order_id` is its OWN internal id and is ignored.
   */
  merchantRefs: string[];
  transactionId?: string;
  amount?: number;
  raw: any;
}

/** Find the first value for any of `keys` anywhere in a nested JSON object. */
/** Every value for any of `keys` anywhere in a nested JSON object. */
function deepFindAll(obj: any, keys: string[], depth = 0, out: string[] = []): string[] {
  if (!obj || typeof obj !== 'object' || depth > 5) return out;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') out.push(String(obj[k]));
  for (const v of Object.values(obj)) deepFindAll(v, keys, depth + 1, out);
  return out;
}

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
      merchantRefs: deepFindAll(raw, ['requested_order_id', 'reference', 'merchant_reference', 'order_reference']),
      transactionId: deepFind(raw, ['tran_id', 'transaction_id', 'payment_id'])?.toString(),
      amount: amountRaw != null && !isNaN(Number(amountRaw)) ? Number(amountRaw) : undefined,
      raw,
    };
  } catch (err: any) {
    console.error('[uPayments] status check failed:', err?.response?.status, err?.response?.data || err.message);
    return { paid: false, final: false, merchantRefs: [], raw: { error: err?.response?.data || err.message } };
  }
}

const cod    = new CashOnDeliveryAdapter();
const online = new UPaymentsAdapter();

export function paymentAdapterFor(method: number): PaymentAdapter {
  return method === 3 ? cod : online;
}
