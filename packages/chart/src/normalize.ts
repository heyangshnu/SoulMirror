/** Normalize user-entered birth date/time for iztro (reject fullwidth punctuation etc.). */

export function normalizeBirthDate(raw: string): string {
  let s = (raw ?? '').trim();
  s = s
    .replace(/[年/.．]/g, '-')
    .replace(/[月]/g, '-')
    .replace(/[日号]/g, '')
    .replace(/[－—–]/g, '-')
    .replace(/\s+/g, '');
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return (raw ?? '').trim();
  const y = m[1];
  const mo = m[2].padStart(2, '0');
  const d = m[3].padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Returns HH:mm or empty if unparseable. */
export function normalizeBirthTime(raw: string): string {
  let s = (raw ?? '').trim();
  s = s
    .replace(/[：﹕]/g, ':')
    .replace(/[．。.]/g, ':')
    .replace(/[-－—–]/g, ':')
    .replace(/\s+/g, '');
  const m = s.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (!m) return '';
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return '';
  }
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
