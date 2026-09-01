import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { PLAN_PRICES } from '../common/plan-policy';

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
};

type RazorpayPayment = {
  id: string;
  status: string;
  order_id: string;
  amount: number;
};

@Injectable()
export class RazorpayClient {
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(private readonly configService: ConfigService) {
    // YOU MUST: paste these from https://dashboard.razorpay.com/app/keys into your .env file
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID') || '';
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';
  }

  assertConfigured() {
    if (!this.keyId || !this.keySecret) {
      throw new BadRequestException(
        'Payments are not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the .env file.',
      );
    }
  }

  getPublicKeyId() {
    this.assertConfigured();
    return this.keyId;
  }

  async createOrder(params: {
    amountPaise: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<RazorpayOrder> {
    this.assertConfigured();
    return this.request<RazorpayOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amountPaise,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
        payment_capture: 1,
      }),
    });
  }

  async getOrder(orderId: string): Promise<RazorpayOrder> {
    this.assertConfigured();
    return this.request<RazorpayOrder>(`/orders/${orderId}`, { method: 'GET' });
  }

  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    this.assertConfigured();
    return this.request<RazorpayPayment>(`/payments/${paymentId}`, { method: 'GET' });
  }

  /**
   * Razorpay sends a signature. We recreate it with our secret.
   * If they match, the payment is real. If not, someone is faking success.
   */
  verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
    this.assertConfigured();
    const expected = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  expectedAmount(plan: keyof typeof PLAN_PRICES) {
    return PLAN_PRICES[plan];
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new UnauthorizedException(
        body?.error?.description || 'Razorpay request failed. Check keys and network.',
      );
    }
    return body as T;
  }
}
