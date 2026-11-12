export function normalizePhone(input: unknown): string | null {
  const digits = String(input ?? '').replace(/\D/g, '');
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return /^91[6-9]\d{9}$/.test(normalized) ? normalized : null;
}

export function maskPhone(phone: string | null | undefined): string {
  return phone ? `******${phone.slice(-4)}` : '';
}
