import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../users/user.repository';
import { USER_ROLES } from '../users/user-roles';
import { normalizePhone, maskPhone } from './phone.util';
import { Msg91Service } from './msg91.service';
import { OtpGuardService } from './otp-guard.service';
import type { Response } from 'express';

@Injectable()
export class OtpAuthService {
  private readonly logger = new Logger(OtpAuthService.name);
  private readonly testPhones: Map<string, string>;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly msg91: Msg91Service,
    private readonly guard: OtpGuardService,
    private readonly config: ConfigService,
  ) {
    this.testPhones = this.loadTestPhones();
  }

  async send(phoneInput: unknown, ip: string, response: Response) {
    const phone = this.requirePhone(phoneInput);
    await this.sendOtp(phone, ip, response);
    return { success: true, resend_after_seconds: 30 };
  }

  async resend(phoneInput: unknown, ip: string, response: Response) {
    const phone = this.requirePhone(phoneInput);
    const retryAfter = this.guard.checkSend(phone, ip);
    if (!retryAfter.allowed) {
      this.throwOtpError(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        undefined,
        retryAfter.retryAfter,
        response,
      );
    }

    if (!this.testPhones.has(phone)) {
      const result = await this.msg91.retryOtp(phone);
      if (!result.ok) {
        this.logger.warn(`MSG91 OTP resend failed for ${maskPhone(phone)}.`);
        this.throwOtpError(
          HttpStatus.BAD_GATEWAY,
          'OTP_SEND_FAILED',
          'Unable to send an OTP right now.',
        );
      }
    }
    return { success: true, resend_after_seconds: 30 };
  }

  async verify(phoneInput: unknown, otpInput: unknown, response: Response) {
    const phone = this.requirePhone(phoneInput);
    const otp = this.requireOtp(otpInput);
    this.assertNotLocked(phone, response);

    if (!(await this.checkOtp(phone, otp))) {
      this.guard.recordFailure(phone);
      this.throwOtpError(HttpStatus.UNAUTHORIZED, 'INVALID_OTP');
    }
    this.guard.clearFailures(phone);

    const user = await this.userRepository.findByOtpPhone(phone);
    if (!user) {
      const signupToken = await this.jwtService.signAsync(
        { phone, purpose: 'otp_signup' },
        { expiresIn: '10m' },
      );
      return { needs_signup: true, signup_token: signupToken };
    }

    const verifiedUser = user.phoneVerifiedAt
      ? user
      : await this.userRepository.update(user.id, {
          phone: user.phone || phone,
          phoneVerifiedAt: new Date(),
        });
    return this.issueTokens(verifiedUser || user);
  }

  async signup(
    body: {
      signup_token?: unknown;
      username?: unknown;
      email?: unknown;
      full_name?: unknown;
      role?: unknown;
    } | null,
  ) {
    const phone = await this.readSignupToken(body?.signup_token);
    const requestBody = body || {};
    const username =
      typeof requestBody.username === 'string'
        ? requestBody.username.trim()
        : '';
    const email =
      typeof requestBody.email === 'string' && requestBody.email.trim()
        ? requestBody.email.trim().toLowerCase()
        : null;
    const fullName =
      typeof requestBody.full_name === 'string' && requestBody.full_name.trim()
        ? requestBody.full_name.trim()
        : username;
    const role =
      typeof requestBody.role === 'string' && requestBody.role.trim()
        ? requestBody.role.trim()
        : 'artist';

    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(username)) {
      this.throwOtpError(HttpStatus.BAD_REQUEST, 'INVALID_USERNAME');
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.throwOtpError(HttpStatus.BAD_REQUEST, 'INVALID_EMAIL');
    }
    if (!USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      this.throwOtpError(HttpStatus.BAD_REQUEST, 'INVALID_ROLE');
    }

    if (
      (await this.userRepository.findByOtpPhone(phone)) ||
      (await this.userRepository.findByUsername(username)) ||
      (email && (await this.userRepository.findByEmail(email)))
    ) {
      this.throwOtpError(HttpStatus.CONFLICT, 'ALREADY_EXISTS');
    }

    try {
      const trkCode = await this.userRepository.generateTrkCode();
      const user = await this.userRepository.create({
        username,
        email,
        password: null,
        fullName,
        role,
        phone,
        phoneVerifiedAt: new Date(),
        trkCode,
      });
      return this.issueTokens(user);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        this.throwOtpError(HttpStatus.CONFLICT, 'ALREADY_EXISTS');
      }
      throw error;
    }
  }

  async sendLink(
    userId: string,
    phoneInput: unknown,
    ip: string,
    response: Response,
  ) {
    const phone = this.requirePhone(phoneInput);
    const existing = await this.userRepository.findByOtpPhone(phone);
    if (existing && existing.id !== userId) {
      this.throwOtpError(HttpStatus.CONFLICT, 'PHONE_IN_USE');
    }
    await this.sendOtp(phone, ip, response);
    return { success: true, resend_after_seconds: 30 };
  }

  async verifyLink(
    userId: string,
    phoneInput: unknown,
    otpInput: unknown,
    response: Response,
  ) {
    const phone = this.requirePhone(phoneInput);
    const otp = this.requireOtp(otpInput);
    this.assertNotLocked(phone, response);
    if (!(await this.checkOtp(phone, otp))) {
      this.guard.recordFailure(phone);
      this.throwOtpError(HttpStatus.UNAUTHORIZED, 'INVALID_OTP');
    }
    this.guard.clearFailures(phone);

    const existing = await this.userRepository.findByOtpPhone(phone);
    if (existing && existing.id !== userId) {
      this.throwOtpError(HttpStatus.CONFLICT, 'PHONE_IN_USE');
    }
    try {
      await this.userRepository.update(userId, {
        phone,
        phoneVerifiedAt: new Date(),
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        this.throwOtpError(HttpStatus.CONFLICT, 'PHONE_IN_USE');
      }
      throw error;
    }
    return { success: true };
  }

  private async sendOtp(
    phone: string,
    ip: string,
    response: Response,
  ): Promise<void> {
    const result = this.guard.checkSend(phone, ip);
    if (!result.allowed) {
      this.throwOtpError(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        undefined,
        result.retryAfter,
        response,
      );
    }
    if (this.testPhones.has(phone)) return;

    const sent = await this.msg91.sendOtp(phone);
    if (!sent.ok) {
      this.logger.warn(`MSG91 OTP send failed for ${maskPhone(phone)}.`);
      this.throwOtpError(
        HttpStatus.BAD_GATEWAY,
        'OTP_SEND_FAILED',
        'Unable to send an OTP right now.',
      );
    }
  }

  private async checkOtp(phone: string, otp: string): Promise<boolean> {
    const testCode = this.testPhones.get(phone);
    if (testCode !== undefined) return testCode === otp;
    const result = await this.msg91.verifyOtp(phone, otp);
    if (!result.ok && result.providerError) {
      this.throwOtpError(
        HttpStatus.BAD_GATEWAY,
        'OTP_PROVIDER_FAILED',
        'Unable to verify the OTP right now.',
      );
    }
    return result.ok;
  }

  private requirePhone(value: unknown): string {
    const phone = normalizePhone(value);
    if (!phone) this.throwOtpError(HttpStatus.BAD_REQUEST, 'INVALID_PHONE');
    return phone;
  }

  private requireOtp(value: unknown): string {
    const otp =
      typeof value === 'string' || typeof value === 'number'
        ? String(value).trim()
        : '';
    if (!new RegExp(`^\\d{4,9}$`).test(otp)) {
      this.throwOtpError(HttpStatus.BAD_REQUEST, 'INVALID_INPUT');
    }
    return otp;
  }

  private assertNotLocked(phone: string, response: Response): void {
    const lock = this.guard.lockStatus(phone);
    if (lock.locked) {
      this.throwOtpError(
        HttpStatus.LOCKED,
        'LOCKED',
        undefined,
        lock.retryAfter,
        response,
      );
    }
  }

  private async readSignupToken(token: unknown): Promise<string> {
    if (typeof token !== 'string' || !token) {
      this.throwOtpError(HttpStatus.UNAUTHORIZED, 'INVALID_SIGNUP_TOKEN');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (
        payload.purpose !== 'otp_signup' ||
        typeof payload.phone !== 'string' ||
        !normalizePhone(payload.phone)
      ) {
        this.throwOtpError(HttpStatus.UNAUTHORIZED, 'INVALID_SIGNUP_TOKEN');
      }
      return payload.phone;
    } catch {
      this.throwOtpError(HttpStatus.UNAUTHORIZED, 'INVALID_SIGNUP_TOKEN');
    }
  }

  private async issueTokens(user: {
    id: string;
    email?: string | null;
    username?: string | null;
    fullName: string;
    phone?: string | null;
    mobile?: string | null;
    role: string;
  }) {
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET');
    if (!refreshSecret) {
      this.throwOtpError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'TOKEN_CONFIGURATION_ERROR',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email || '',
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        { secret: refreshSecret, expiresIn: '30d' },
      ),
    ]);

    return {
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.fullName,
        phone: user.phone || user.mobile,
      },
    };
  }

  private loadTestPhones(): Map<string, string> {
    const enabled =
      this.config.get<string>('NODE_ENV') !== 'production' ||
      this.config.get<string>('ALLOW_OTP_TEST_PHONES') === 'true';
    const phones = new Map<string, string>();
    if (!enabled) return phones;

    const configured = this.config.get<string>('OTP_TEST_PHONES') || '';
    for (const pair of configured.split(',')) {
      const [rawPhone, code, ...extra] = pair.split(':');
      const phone = normalizePhone(rawPhone);
      if (phone && code && /^\d{4,9}$/.test(code.trim()) && !extra.length) {
        phones.set(phone, code.trim());
      }
    }
    return phones;
  }

  private throwOtpError(
    status: number,
    error: string,
    message?: string,
    retryAfter?: number,
    response?: Response,
  ): never {
    if (retryAfter !== undefined) {
      response?.setHeader('Retry-After', String(retryAfter));
    }
    throw new HttpException(
      {
        error,
        ...(message ? { message } : {}),
        ...(retryAfter !== undefined ? { retry_after: retryAfter } : {}),
      },
      status,
    );
  }
}
