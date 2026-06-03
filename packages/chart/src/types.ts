export type CalendarType = 'solar' | 'lunar';
export type Gender = 'male' | 'female';

export interface BirthInput {
  birthDate: string;
  birthTime: string;
  gender: Gender;
  calendar?: CalendarType;
  isLeapMonth?: boolean;
  birthPlace?: string;
  longitude?: number;
  timeUnknown?: boolean;
}

export interface PalaceSummary {
  name: string;
  earthlyBranch: string;
  majorStars: string[];
  minorStars: string[];
  mutagen: string[];
  brightness: Record<string, string>;
}

export interface NatalChartSummary {
  solarDate: string;
  lunarDate: string;
  timeRange: string;
  gender: string;
  soul: string;
  body: string;
  fiveElementsClass: string;
  palaces: PalaceSummary[];
  pillars: { year: string; month: string; day: string; hour: string };
  timeUnknown: boolean;
  trueSolarTimeApplied: boolean;
  solarTimeOffsetMinutes: number;
  longitude: number;
  algorithmVersion: string;
}

export interface HoroscopeSummary {
  currentAge: number;
  decadal: { range: string; palace: string; majorStars: string[] };
  yearly: { year: number; palace: string; majorStars: string[]; mutagen: string[] };
  monthly?: { month: number; palace: string };
}
