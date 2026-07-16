export const FUXI_INIT_NODES = [
  { code: 'A01', title: '本命总解' },
  { code: 'A02', title: '八字气候报告' },
  { code: 'A03', title: '紫微生命地图' },
  { code: 'A04', title: '一生命势报告' },
  { code: 'A05', title: '命盘机制卡报告' },
  { code: 'B06', title: '全生命周期大运大限报告' },
  { code: 'B07', title: '当前十年深解' },
  { code: 'B10', title: '当前流年报告' },
  { code: 'C13', title: '事业成事报告' },
  { code: 'C16', title: '财富资源报告' },
  { code: 'C18', title: '合作团队报告' },
  { code: 'C19', title: '学习认知报告' },
  { code: 'C20', title: '表达内容报告' },
  { code: 'C24', title: '健康精力报告' },
  { code: 'C25', title: '福德内在报告' },
  { code: 'D28', title: '亲密关系报告' },
] as const;

export const FUXI_CORE_NODE_CODES = ['A01', 'A02', 'A03', 'A04', 'A05'] as const;

export type AgentInitPhase = 'pending' | 'running' | 'chat_ready' | 'partial' | 'done' | 'failed' | 'skipped';

export function userSlug(userId: string): string {
  return `u_${userId}`;
}

export interface AgentBirthPayload {
  gender: string;
  birthDateTime: string;
  timezone: string;
  birthPlace: string | null;
  accuracy: Record<string, unknown>;
}

export function birthProfileToAgentPayload(profile: {
  gender: string;
  birthDate: string;
  birthTime: string;
  birthPlace?: string;
  timeUnknown?: boolean;
  calendar?: string;
  isLeapMonth?: boolean;
  longitude?: number;
}): AgentBirthPayload {
  const time = profile.birthTime?.trim() || '12:00:00';
  const birthDateTime = profile.birthDate.includes('T')
    ? profile.birthDate
    : `${profile.birthDate}T${time}`;
  return {
    gender: profile.gender,
    birthDateTime,
    timezone: 'Asia/Shanghai',
    birthPlace: profile.birthPlace ?? null,
    accuracy: {
      time: profile.timeUnknown ? 'unknown' : 'exact',
      place: profile.birthPlace ? 'provided' : 'missing',
      calendar: profile.calendar ?? 'solar',
      isLeapMonth: profile.isLeapMonth ?? false,
      ...(typeof profile.longitude === 'number' ? { longitude: profile.longitude } : {}),
    },
  };
}

export function agentHostWsUrl(httpBase: string, slug: string): string {
  const url = new URL(httpBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = `slug=${encodeURIComponent(slug)}`;
  return url.toString();
}
