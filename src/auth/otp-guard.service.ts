import { Injectable } from '@nestjs/common';

const SEND_COOLDOWN_MS = 30_000;
const PHONE_WINDOW_MS = 10 * 60_000;
const IP_WINDOW_MS = 60 * 60_000;
const PHONE_SEND_LIMIT = 3;
const IP_SEND_LIMIT = 10;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;
const MAX_TRACKED_KEYS = 10_000;

interface FailureState {
  count: number;
  lockedUntil: number;
}

@Injectable()
export class OtpGuardService {
  private readonly phoneSends = new Map<string, number[]>();
  private readonly ipSends = new Map<string, number[]>();
  private readonly failures = new Map<string, FailureState>();

  checkSend(
    phone: string,
    ip: string,
  ): { allowed: true } | { allowed: false; retryAfter: number } {
    const now = Date.now();
    if (
      this.phoneSends.size >= MAX_TRACKED_KEYS ||
      this.ipSends.size >= MAX_TRACKED_KEYS ||
      this.failures.size >= MAX_TRACKED_KEYS
    ) {
      this.prune(now);
    }
    const phoneTimes = this.recent(
      this.phoneSends.get(phone),
      PHONE_WINDOW_MS,
      now,
    );
    const ipTimes = this.recent(this.ipSends.get(ip), IP_WINDOW_MS, now);
    const lastPhoneSend = phoneTimes.at(-1);
    this.phoneSends.set(phone, phoneTimes);
    this.ipSends.set(ip, ipTimes);

    if (lastPhoneSend !== undefined && now - lastPhoneSend < SEND_COOLDOWN_MS) {
      return {
        allowed: false,
        retryAfter: Math.ceil(
          (SEND_COOLDOWN_MS - (now - lastPhoneSend)) / 1000,
        ),
      };
    }
    if (phoneTimes.length >= PHONE_SEND_LIMIT) {
      return {
        allowed: false,
        retryAfter: Math.ceil((PHONE_WINDOW_MS - (now - phoneTimes[0])) / 1000),
      };
    }
    if (ipTimes.length >= IP_SEND_LIMIT) {
      return {
        allowed: false,
        retryAfter: Math.ceil((IP_WINDOW_MS - (now - ipTimes[0])) / 1000),
      };
    }

    phoneTimes.push(now);
    ipTimes.push(now);
    return { allowed: true };
  }

  lockStatus(
    phone: string,
  ): { locked: false } | { locked: true; retryAfter: number } {
    const state = this.failures.get(phone);
    if (state?.lockedUntil && state.lockedUntil > Date.now()) {
      return {
        locked: true,
        retryAfter: Math.ceil((state.lockedUntil - Date.now()) / 1000),
      };
    }
    return { locked: false };
  }

  recordFailure(phone: string): void {
    if (this.failures.size >= MAX_TRACKED_KEYS) {
      this.prune(Date.now());
    }
    const current = this.failures.get(phone);
    const state =
      current && current.lockedUntil <= Date.now()
        ? current
        : { count: 0, lockedUntil: 0 };
    state.count += 1;
    if (state.count >= MAX_FAILURES) {
      state.lockedUntil = Date.now() + LOCK_MS;
      state.count = 0;
    }
    this.failures.set(phone, state);
  }

  clearFailures(phone: string): void {
    this.failures.delete(phone);
  }

  private recent(
    entries: number[] | undefined,
    windowMs: number,
    now: number,
  ): number[] {
    return (entries || []).filter((timestamp) => now - timestamp < windowMs);
  }

  private prune(now: number): void {
    this.pruneSendMap(this.phoneSends, PHONE_WINDOW_MS, now);
    this.pruneSendMap(this.ipSends, IP_WINDOW_MS, now);

    for (const [phone, state] of this.failures) {
      if (state.count === 0 && state.lockedUntil <= now) {
        this.failures.delete(phone);
      }
    }
    while (this.failures.size >= MAX_TRACKED_KEYS) {
      const oldest = this.failures.keys().next().value;
      if (oldest === undefined) break;
      this.failures.delete(oldest);
    }
  }

  private pruneSendMap(
    entries: Map<string, number[]>,
    windowMs: number,
    now: number,
  ): void {
    for (const [key, timestamps] of entries) {
      const active = this.recent(timestamps, windowMs, now);
      if (!active.length) entries.delete(key);
      else entries.set(key, active);
    }
    while (entries.size >= MAX_TRACKED_KEYS) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }
}
