import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DOMAIN_DIRS = {
  ming: '01_命',
  yuan: '02_愿',
  jing: '03_境',
  yuan_rel: '04_缘',
  li: '05_力',
} as const;

export type MemoryDomain = keyof typeof DOMAIN_DIRS;

export function resolveInside(root: string, child: string) {
  const resolved = path.resolve(root, child);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error('Path escaped memory root.');
  }
  return resolved;
}

export async function listMarkdownFiles(dir: string, base: string): Promise<string[]> {
  const { readdir, stat } = await import('node:fs/promises');
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const out: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...(await listMarkdownFiles(full, base)));
      else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
        out.push(path.relative(base, full));
      }
    }
    return out.sort();
  } catch {
    return [];
  }
}

export async function readProjectFile(projectPath: string, rel: string, maxChars = 120_000) {
  const normalized = rel.replace(/^[/\\]+/u, '');
  const full = resolveInside(projectPath, normalized);
  const content = await readFile(full, 'utf8');
  if (content.length > maxChars) {
    return { content: content.slice(0, maxChars), truncated: true };
  }
  return { content, truncated: false };
}

function isNoiseNoteRel(rel: string) {
  return /执行回执|receipt|chart_asset|_prompt|L0_模型事实|_bootstrap_plan/i.test(rel);
}

function firstParagraph(text: string, maxLen = 200) {
  let body = text.replace(/^---[\s\S]*?---\n/m, '').trim();
  const section = body.match(
    /##\s*(Summary|摘要|概述|一句话|当前状态)\s*\n([\s\S]*?)(?=\n##\s|$)/iu,
  )?.[2];
  if (section?.trim()) body = section.trim();
  const candidates = body
    .split(/\n{2,}/)
    .map((chunk) =>
      chunk
        .replace(/^#+\s*/gm, '')
        .replace(/[*_`>#\[\]]/g, '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((chunk) => chunk.length > 8);
  const para =
    candidates.find((chunk) => !/(执行回执|receipt|chart_asset|mcp__)/i.test(chunk)) ??
    candidates[0] ??
    '';
  if (!para) return '';
  if (para.length < 48 && /(执行回执|receipt|B\d{2}\b)/i.test(para)) return '';
  return para.length > maxLen ? `${para.slice(0, maxLen)}…` : para;
}

function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return out;
}

function isPendingNote(text: string) {
  const fm = parseFrontmatter(text);
  const status = (fm.status || '').toLowerCase();
  if (status.includes('pending_confirmation') || status.includes('pending')) return true;
  if (text.includes('[pending_confirmation]')) return true;
  if (/## Pending Confirmation[\s\S]*?\S/.test(text)) return true;
  return text.includes('待印证：是');
}

function parseSection(body: string, heading: string) {
  const re = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'u');
  const m = body.match(re);
  return (m?.[1] ?? '').trim();
}

function parseTopicDetail(content: string) {
  const fm = parseFrontmatter(content);
  const body = content.replace(/^---[\s\S]*?---\n/m, '');
  const summaryMatch = body.match(/## Summary\s*\n([\s\S]*?)(?=\n## |$)/);
  const summary = (summaryMatch?.[1] ?? firstParagraph(body)).trim();
  const obsMatch = body.match(/## Observations\s*\n([\s\S]*?)(?=\n## |$)/);
  const evidence: Array<{ kind: string; text: string }> = [];
  if (obsMatch?.[1]) {
    for (const block of obsMatch[1].split(/\n-\s*\[/)) {
      const kind = block.match(/^([^\]]+)\]/)?.[1]?.trim() ?? 'note';
      const text = block.replace(/^[^\]]+\]\s*/u, '').trim();
      if (text) evidence.push({ kind, text: text.slice(0, 500) });
    }
  }
  return {
    summary,
    evidence,
    insights: parseSection(body, 'Insights') || parseSection(body, '洞察'),
    nextSteps: parseSection(body, 'Next Steps') || parseSection(body, '下一步'),
    history: parseSection(body, 'History') || parseSection(body, '历史'),
    status: fm.status ?? 'active',
    domain: fm.domain,
    updatedAt: fm.updated_at || fm.updatedAt,
  };
}

export async function buildMemoryDashboard(projectPath: string) {
  const result: Record<string, { summary: string; fileCount: number; recent: string[] }> = {};
  for (const [key, dir] of Object.entries(DOMAIN_DIRS)) {
    const files = await listMarkdownFiles(path.join(projectPath, dir), projectPath);
    const noteFiles = files.filter((f) => f.endsWith('.md') && !f.includes('_prompt'));
    const preferred = [...noteFiles].reverse().find((f) => !isNoiseNoteRel(f)) ?? noteFiles.at(-1);
    let summary = '';
    if (preferred) {
      try {
        const { content } = await readProjectFile(projectPath, preferred, 4000);
        summary = firstParagraph(content);
      } catch {
        summary = '';
      }
    }
    result[key] = {
      summary,
      fileCount: noteFiles.length,
      recent: noteFiles.slice(-5),
    };
  }
  return result;
}

export async function listPendingNotes(projectPath: string) {
  const pending: Array<{ id: string; rel: string; domain: string; excerpt: string; title: string }> = [];
  for (const [domain, dir] of Object.entries(DOMAIN_DIRS)) {
    const files = await listMarkdownFiles(path.join(projectPath, dir), projectPath);
    for (const rel of files) {
      if (!rel.endsWith('.md') || rel.includes('_prompt')) continue;
      try {
        const { content } = await readProjectFile(projectPath, rel, 8000);
        if (!isPendingNote(content)) continue;
        const title = path.basename(rel, '.md');
        pending.push({
          id: rel.replace(/[/\\]/g, '__'),
          rel,
          domain,
          title,
          excerpt: firstParagraph(content, 160),
        });
      } catch {
        /* skip */
      }
    }
  }
  return pending;
}

export async function listMingReports(projectPath: string) {
  const mingDir = path.join(projectPath, DOMAIN_DIRS.ming);
  const files = await listMarkdownFiles(mingDir, projectPath);
  return files
    .filter((f) => f.endsWith('.md') && !f.includes('_prompt') && !f.includes('chart_asset'))
    .map((rel) => {
      const base = path.basename(rel, '.md');
      const codeMatch = base.match(/^([A-Z]\d+)/);
      return {
        code: codeMatch?.[1] ?? base.slice(0, 8),
        title: base.replace(/^[A-Z]\d+_?/, '').replace(/_/g, ' '),
        rel,
      };
    });
}

export async function confirmMemoryNote(
  projectPath: string,
  rel: string,
  action: 'confirm' | 'reject',
) {
  const { content } = await readProjectFile(projectPath, rel, 500_000);
  let updated = content;
  if (action === 'confirm') {
    updated = updated
      .replace(/status:\s*pending_confirmation/gi, 'status: active')
      .replace(/待印证：是/g, '待印证：否');
    if (!updated.includes('status:')) {
      updated = `---\nstatus: active\n---\n\n${updated}`;
    }
  } else {
    updated = updated
      .replace(/status:\s*pending_confirmation/gi, 'status: rejected')
      .replace(/待印证：是/g, '待印证：否');
  }
  const full = resolveInside(projectPath, rel);
  await writeFile(full, updated, 'utf8');
  return { ok: true, action, rel };
}

export async function readTopicDetail(projectPath: string, rel: string) {
  const normalized = rel.includes('__') ? rel.replace(/__/g, '/') : rel;
  const { content } = await readProjectFile(projectPath, normalized, 120_000);
  const parsed = parseTopicDetail(content);
  return {
    id: normalized.replace(/[/\\]/g, '__'),
    rel: normalized,
    title: path.basename(normalized, '.md'),
    ...parsed,
    body: content.replace(/^---[\s\S]*?---\n/m, ''),
  };
}

export async function writeProjectFile(projectPath: string, rel: string, content: string) {
  const normalized = rel.replace(/^[/\\]+/u, '');
  const full = resolveInside(projectPath, normalized);
  await import('node:fs/promises').then(({ mkdir }) =>
    mkdir(path.dirname(full), { recursive: true }),
  );
  await writeFile(full, content, 'utf8');
  return { ok: true, rel: normalized };
}

export async function listTopics(projectPath: string, status?: string) {
  const topics: Array<{ id: string; title: string; domain: string; status: string; excerpt: string; updatedAt?: string }> = [];
  for (const domain of ['yuan', 'jing'] as const) {
    const dir = DOMAIN_DIRS[domain];
    const files = await listMarkdownFiles(path.join(projectPath, dir), projectPath);
    for (const rel of files) {
      if (!rel.endsWith('.md') || rel.includes('_prompt') || rel.includes('_network')) continue;
      try {
        const { content } = await readProjectFile(projectPath, rel, 6000);
        const fm = parseFrontmatter(content);
        const noteStatus = (fm.status || 'active').toLowerCase();
        if (status && status !== 'all' && !noteStatus.includes(status)) continue;
        topics.push({
          id: rel.replace(/[/\\]/g, '__'),
          title: path.basename(rel, '.md').replace(/^\d+_/, ''),
          domain,
          status: noteStatus,
          excerpt: firstParagraph(content, 120),
          updatedAt: fm.updated_at || fm.updatedAt,
        });
      } catch {
        /* skip */
      }
    }
  }
  return topics.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function pickCurrentTopic(projectPath: string) {
  const topics = await listTopics(projectPath, 'active');
  const hit = topics[0];
  if (!hit) return null;
  try {
    const detail = await readTopicDetail(projectPath, hit.id.replace(/__/g, '/'));
    return {
      id: hit.id,
      title: hit.title,
      domain: hit.domain,
      status: hit.status,
      summary: detail.summary,
      excerpt: hit.excerpt,
    };
  } catch {
    return hit;
  }
}

export async function listRecentActivity(projectPath: string, limit = 8) {
  const topics = await listTopics(projectPath);
  return topics.slice(0, limit).map((t) => ({
    id: t.id,
    title: t.title,
    domain: t.domain,
    excerpt: t.excerpt,
    updatedAt: t.updatedAt,
  }));
}

export async function buildDomainDetail(projectPath: string, domain: string) {
  const dash = await buildMemoryDashboard(projectPath);
  const key = domain as MemoryDomain;
  const entry = dash[key];
  if (!entry) return null;
  const allTopics = await listTopics(projectPath);
  const domainTopics = allTopics.filter((t) => t.domain === domain || (domain === 'yuan_rel' && t.domain === 'yuan_rel'));
  return {
    ...entry,
    domain,
    topics: domainTopics,
    layers: {
      L0: entry.summary,
      recent: entry.recent,
    },
  };
}

export async function readCrossAxisEvent(projectPath: string, eventId: string) {
  const eventsRel = '06_功曹/events.jsonl';
  const axes: Array<{ domain: string; title: string; excerpt: string; topicId?: string }> = [];
  let summary = '';
  try {
    const { content } = await readProjectFile(projectPath, eventsRel, 500_000);
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as { id?: string; summary?: string; axes?: Array<{ domain: string; title: string; excerpt?: string; topicId?: string }> };
        if (row.id && row.id !== eventId && !eventId.includes(row.id)) continue;
        summary = row.summary ?? summary;
        if (row.axes) axes.push(...row.axes.map((a) => ({ ...a, excerpt: a.excerpt ?? '' })));
      } catch {
        /* skip bad line */
      }
    }
  } catch {
    /* no events file */
  }
  if (!axes.length) {
    const topics = await listTopics(projectPath);
    const related = topics.filter((t) => t.id.includes(eventId) || eventId.includes(t.domain));
    return {
      id: eventId,
      summary: related.map((t) => t.excerpt).join(' · ') || '跨轴关联记录',
      axes: related.map((t) => ({ domain: t.domain, title: t.title, excerpt: t.excerpt, topicId: t.id })),
    };
  }
  return { id: eventId, summary: summary || axes.map((a) => a.excerpt).join(' · '), axes };
}
