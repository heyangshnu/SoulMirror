import { resolveLongitude } from './cities';

const TZ_MERIDIAN = 120; // 中国标准时间基准经度

/** 真太阳时修正：平太阳时 + 经度差（每度 4 分钟） */
export function applyTrueSolarTime(
  dateStr: string,
  timeStr: string,
  options: { birthPlace?: string; longitude?: number },
): { adjustedTime: string; offsetMinutes: number; longitude: number } {
  const longitude = resolveLongitude(options.birthPlace, options.longitude);
  const offsetMinutes = Math.round((longitude - TZ_MERIDIAN) * 4);

  const [h, m] = timeStr.split(':').map(Number);
  let total = h * 60 + m + offsetMinutes;
  total = ((total % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  const adjustedTime = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;

  return { adjustedTime, offsetMinutes, longitude };
}

/** 时辰索引 0-11：子丑寅…亥；未知时辰默认午时(6) */
export function hourToTimeIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0; // 子时
  return Math.floor((hour + 1) / 2);
}

export function timeStringToIndex(time: string, timeUnknown = false): number {
  if (timeUnknown) return 6;
  const [h] = time.split(':').map(Number);
  return hourToTimeIndex(h);
}
