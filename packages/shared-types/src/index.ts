export type TestType = 'bazi' | 'mbti' | 'tarot' | 'palm';

export type BotTone = 'gentle' | 'rational' | 'humorous';

export interface UserProfile {
  ageRange?: string;
  occupation?: string;
  concern?: string;
  botTone: BotTone;
  anonymousMode?: boolean;
}

export interface ReportSection {
  title: string;
  content: string;
}

export interface TestReport {
  id: string;
  userId: string;
  testType: TestType;
  title: string;
  summary: string;
  score?: number;
  scoreLabel?: string;
  sections: ReportSection[];
  createdAt: string;
}

export interface MbtiAnswer {
  questionId: number;
  value: number;
}

export interface BaziInput {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  calendar: 'solar' | 'lunar';
  birthPlace?: string;
}

export interface TarotInput {
  domain: 'love' | 'career' | 'health' | 'general';
}

export interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  upright: boolean;
  meaning: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface BotSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface TestCatalogItem {
  type: TestType;
  title: string;
  subtitle: string;
  duration: string;
  icon: string;
}

export interface AuthTokens {
  accessToken: string;
  user: { id: string; phone?: string; nickname?: string };
}
