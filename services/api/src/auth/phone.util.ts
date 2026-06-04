import { BadRequestException } from '@nestjs/common';

/** 规范化：去空格/横线，00 前缀转 + */
export function normalizePhone(input: string): string {
  let p = input.trim().replace(/[\s-]/g, '');
  if (p.startsWith('00')) p = `+${p.slice(2)}`;
  if (!p.startsWith('+') && /^1\d{10}$/.test(p)) return p;
  if (!p.startsWith('+') && /^\d{8,15}$/.test(p)) return `+${p}`;
  return p;
}

export function isValidPhone(input: string): boolean {
  const p = normalizePhone(input);
  if (/^1\d{10}$/.test(p)) return true;
  if (/^\+[1-9]\d{7,14}$/.test(p)) return true;
  if (/^00[1-9]\d{7,14}$/.test(input.trim().replace(/[\s-]/g, ''))) return true;
  return false;
}

export function assertValidPhone(input: string): string {
  const p = normalizePhone(input);
  if (!isValidPhone(input)) {
    throw new BadRequestException('请输入有效的手机号（中国大陆 11 位或国际格式 +区号）');
  }
  return p;
}
