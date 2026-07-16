import { api } from './api';

export type AgentMode = 'legacy' | 'claude';

let cached: { mode: AgentMode; at: number } | null = null;

export async function getAgentMode(force = false): Promise<AgentMode> {
  if (!force && cached && Date.now() - cached.at < 60_000) {
    return cached.mode;
  }
  try {
    const res = await api.get<{ agentMode?: string }>('/agent/health', false);
    const mode: AgentMode = res.agentMode === 'claude' ? 'claude' : 'legacy';
    cached = { mode, at: Date.now() };
    return mode;
  } catch {
    return 'legacy';
  }
}

export function isClaudeAgentMode(mode: AgentMode) {
  return mode === 'claude';
}
