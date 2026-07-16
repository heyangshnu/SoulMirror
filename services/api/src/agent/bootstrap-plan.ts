import type { PlanReportInput } from '../reports/reports.service';

export interface BootstrapPlanPayload {
  portrait: string;
  stage?: string;
  plans: Array<{ title: string; body: string; actions: string[] }>;
  disclaimer?: string;
  coverageLevel?: string;
}

export function planInputToBootstrapPayload(
  natal: PlanReportInput,
  recent: PlanReportInput,
): BootstrapPlanPayload {
  const plans = [...(natal.plans ?? []), ...(recent.plans ?? [])].slice(0, 4);
  return {
    portrait: natal.portrait || natal.summary || '',
    stage: recent.stage || recent.portrait || recent.summary || '',
    plans: plans.map((p) => ({
      title: p.title,
      body: p.body,
      actions: p.actions ?? [],
    })),
    disclaimer: natal.disclaimer || recent.disclaimer,
    coverageLevel: natal.coverageLevel || recent.coverageLevel,
  };
}

export function renderBootstrapPlanMarkdown(payload: BootstrapPlanPayload): string {
  const planBlocks = payload.plans
    .map((p) => {
      const actions = p.actions.length
        ? `\n\n**可执行建议**\n${p.actions.map((a) => `- ${a}`).join('\n')}`
        : '';
      return `## ${p.title}\n\n${p.body}${actions}`;
    })
    .join('\n\n');

  return `---
title: v4 快轨生活方案
type: bootstrap_plan
domain: 命
layer: L1
status: active
confidence: medium
stability: phase
salience: high
tags:
  - "#命"
  - "#bootstrap"
  - "#v4_fast_track"
---

# 快轨方案摘要

> 来自 v4 内容库 + 排盘合成。伏羲深度报告（A01–A16）生成后会逐步增强或替换本节。

## 你的底色

${payload.portrait.trim()}

## 这几年

${(payload.stage || '（阶段判断生成中）').trim()}

${planBlocks}

${payload.disclaimer ? `\n---\n\n${payload.disclaimer}\n` : ''}
`;
}
