export function normalizeNigerianPhone(input: string): string | null {
  const digits = String(input || '').replace(/\D/g, '');
  let local: string | null = null;
  if (digits.length === 13 && digits.startsWith('234')) local = `0${digits.slice(3)}`;
  else if (digits.length === 11 && digits.startsWith('0')) local = digits;
  else if (digits.length === 10 && /^[789]/.test(digits)) local = `0${digits}`;
  if (local && /^0[789]\d{9}$/.test(local)) return local;
  return null;
}

export const isValidNigerianPhone = (input: string): boolean => normalizeNigerianPhone(input) !== null;
