export type PlanTopic =
  | 'self_profile'
  | 'recent_years'
  | 'career'
  | 'marriage'
  | 'child'
  | 'parent'
  | 'family'
  | 'partner_conflict'
  | 'child_environment'
  | 'synastry'
  | 'family_system';

export type EvidenceSource = 'BZ' | 'ZW-M' | 'ZW-D' | 'ZW-Y' | 'REAL' | 'CHAT' | 'SYN';

export type CoverageLevel = 'full' | 'partial' | 'minimal';

export interface PlanCard {
  id: string;
  title: string;
  body: string;
  actions: string[];
  phrases?: string[];
}

export interface PlanReportPayload {
  topic: PlanTopic;
  title: string;
  portrait: string;
  stage?: string;
  plans: PlanCard[];
  followUpQuestions: string[];
  disclaimer: string;
  coverageLevel: CoverageLevel;
  summary?: string;
  headlineSummary?: string;
  testType?: string;
}

export interface InternalAnalysisCard {
  id: string;
  conclusion: string;
  sources: { type: EvidenceSource; evidence: string }[];
  reasoning: string[];
  confidence: number;
  matchedContentIds: string[];
}

export interface RealContext {
  relationshipStatus?: 'single' | 'dating' | 'married' | 'separated';
  hasChildren?: boolean;
  childAge?: number;
  parentHealthConcern?: boolean;
  cityChangeRecently?: boolean;
  financialPressure?: 'low' | 'medium' | 'high';
  careerStage?: string;
  partnerNotes?: string;
  currentConflict?: string;
  freeText?: string;
  chatSummary?: string;
  voiceDiaryEntries?: string[];
  currentState?: string;
  focusDirection?: string;
  weeklyFocus?: string;
}
