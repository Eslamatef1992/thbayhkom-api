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
  private get apiKey()    { return process.env.UPAYMENTS_API_KEY || 'NWty8gdjt79cf756hdtyu6u8jht5ns6gfhgy8hdjL'; }

  private methodSrc(method: number): string {
    if (method === 2) return 'cc';
    if (method === 4) return 'sadad';
    return 'knet';
  }

  async createPayment(order: any, method: number, lang: 'en' | 'ar'): Promise<PaymentResult> {
    const url = this.isSandbox ? this.sandboxUrl : this.liveUrl;
    const successUrl = config.payment.successUrl.replace('{lang}', lang);
    const failUrl    = config.payment.failUrl.replace('{lang}', lang);

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
        returnUrl:  successUrl,
        cancelUrl:  failUrl,
        notificationUrl: successUrl,
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

const cod    = new CashOnDeliveryAdapter();
const online = new UPaymentsAdapter();

export function paymentAdapterFor(method: number): PaymentAdapter {
  return method === 3 ? cod : online;
}
