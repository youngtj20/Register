export function normalizeNigerianPhone(input = '') {
  const digits = String(input).replace(/\D/g, '');
  let local = null;
  if (digits.length === 13 && digits.startsWith('234')) local = `0${digits.slice(3)}`;
  else if (digits.length === 11 && digits.startsWith('0')) local = digits;
  else if (digits.length === 10 && /^[789]/.test(digits)) local = `0${digits}`;
  if (local && /^0[789]\d{9}$/.test(local)) return local;
  return null;
}
