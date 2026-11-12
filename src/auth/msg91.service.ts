import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MSG91_OTP_API = 'https://control.msg91.com/api/v5/otp';

interface Msg91Result {
  ok: boolean;
  providerError?: boolean;
  message?: string;
}

@Injectable()
export class Msg91Service {
  constructor(private readonly config: ConfigService) {}

  async sendOtp(mobile: string): Promise<Msg91Result> {
    const length = this.getIntegerConfig('OTP_LENGTH', 6, 4, 9);
    const expiry = this.getIntegerConfig('OTP_EXPIRY_MINUTES', 5, 1, 60);
    return this.call('POST', {
      template_id: this.config.get<string>('MSG91_OTP_TEMPLATE_ID') || '',
      mobile,
      otp_length: length,
      otp_expiry: expiry,
    });
  }

  async verifyOtp(mobile: string, otp: string): Promise<Msg91Result> {
    return this.call('GET', { mobile, otp }, '/verify');
  }

  async retryOtp(mobile: string): Promise<Msg91Result> {
    return this.call('GET', { mobile, retrytype: 'text' }, '/retry');
  }

  private async call(
    method: 'GET' | 'POST',
    params: Record<string, string | number>,
    suffix = '',
  ): Promise<Msg91Result> {
    const authKey = this.config.get<string>('MSG91_AUTHKEY');
    if (!authKey || (method === 'POST' && !params.template_id)) {
      return {
        ok: false,
        providerError: true,
        message: 'MSG91 is not configured',
      };
    }

    const url = new URL(`${MSG91_OTP_API}${suffix}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          authkey: authKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      const data: unknown = await response.json().catch(() => ({}));
      const result =
        typeof data === 'object' && data !== null
          ? (data as { type?: unknown; message?: unknown })
          : {};
      const message =
        typeof result.message === 'string' ? result.message : undefined;
      const invalidOtp =
        suffix === '/verify' &&
        !!message &&
        /(?:otp|code).*(?:invalid|expired|match|wrong)|(?:invalid|expired|wrong).*(?:otp|code)/i.test(
          message,
        );
      return {
        ok: response.ok && result.type === 'success',
        providerError:
          !response.ok || (result.type !== 'success' && !invalidOtp),
        message,
      };
    } catch (error) {
      return {
        ok: false,
        providerError: true,
        message: error instanceof Error ? error.name : 'provider_error',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private getIntegerConfig(
    name: string,
    fallback: number,
    minimum: number,
    maximum: number,
  ): number {
    const value = Number(this.config.get<string>(name));
    return Number.isInteger(value) && value >= minimum && value <= maximum
      ? value
      : fallback;
  }
}
