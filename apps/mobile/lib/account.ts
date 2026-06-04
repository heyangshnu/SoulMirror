export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPhone(value: string) {
  const p = value.trim().replace(/[\s-]/g, '');
  if (/^1\d{10}$/.test(p)) return true;
  if (/^\+[1-9]\d{7,14}$/.test(p)) return true;
  if (/^00[1-9]\d{7,14}$/.test(p)) return true;
  return false;
}

export function detectAccountType(value: string): 'email' | 'phone' | null {
  const v = value.trim();
  if (!v) return null;
  if (v.includes('@')) return isEmail(v) ? 'email' : null;
  return isPhone(v) ? 'phone' : null;
}

export function normalizeAccount(value: string, kind: 'email' | 'phone') {
  return kind === 'email' ? value.trim().toLowerCase() : value.trim();
}
