import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { listMarkdownFiles, readProjectFile, resolveInside } from './memory-http.js';

const DOMAIN_DIRS: Record<string, string> = {
  yuan: '02_愿',
  jing: '03_境',
  yuan_rel: '04_缘',
  li: '05_力',
};

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

function firstParagraph(text: string, maxLen = 120) {
  const body = text.replace(/^---[\s\S]*?---\n/m, '').trim();
  const para = body.split(/\n{2,}/)[0]?.replace(/\n/g, ' ').trim() ?? '';
  return para.length > maxLen ? `${para.slice(0, maxLen)}…` : para;
}

/** Maintain per-domain _network/index.md active topic maps (Phase 6). */
export async function maintainActiveIndexes(projectPath: string): Promise<{ updated: string[] }> {
  const updated: string[] = [];
  for (const [domain, dir] of Object.entries(DOMAIN_DIRS)) {
    const domainPath = path.join(projectPath, dir);
    const networkDir = path.join(domainPath, '_network');
    const indexPath = path.join(networkDir, 'index.md');
    const files = await listMarkdownFiles(domainPath, projectPath);
    const notes = files.filter((f) => f.endsWith('.md') && !f.includes('_prompt') && !f.includes('_network'));
    const lines = [`# Active topics (${domain})`, '', `Updated: ${new Date().toISOString()}`, ''];
    for (const rel of notes.slice(-20)) {
      try {
        const { content } = await readProjectFile(projectPath, rel, 4000);
        const fm = parseFrontmatter(content);
        const status = (fm.status || 'active').toLowerCase();
        if (status.includes('archived') || status.includes('rejected')) continue;
        const title = path.basename(rel, '.md');
        lines.push(`- [${title}](${rel.replace(/\\/g, '/')}) — ${status} — ${firstParagraph(content, 80)}`);
      } catch {
        /* skip */
      }
    }
    await import('node:fs/promises').then(({ mkdir }) => mkdir(networkDir, { recursive: true }));
    await writeFile(indexPath, `${lines.join('\n')}\n`, 'utf8');
    updated.push(indexPath);
  }
  return { updated };
}

/** Compact Gongcao routing-memory.md when it grows too large. */
export async function compactGongcaoRouting(projectPath: string, maxLines = 400): Promise<{ compacted: boolean }> {
  const rel = '06_功曹/routing-memory.md';
  const full = resolveInside(projectPath, rel);
  let content: string;
  try {
    content = await readFile(full, 'utf8');
  } catch {
    return { compacted: false };
  }
  const lines = content.split('\n');
  if (lines.length <= maxLines) return { compacted: false };
  const header = lines.slice(0, 20);
  const tail = lines.slice(-Math.floor(maxLines / 2));
  const compacted = [
    ...header,
    '',
    `<!-- compacted ${new Date().toISOString()}: kept head + recent tail -->`,
    '',
    ...tail,
  ].join('\n');
  await writeFile(full, compacted, 'utf8');
  return { compacted: true };
}

/** Move duplicate observation blocks into 08_归档/ sediment folder. */
export async function sedimentDuplicateObservations(projectPath: string): Promise<{ archived: number }> {
  const archiveDir = path.join(projectPath, '08_归档');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(archiveDir, { recursive: true }));
  let archived = 0;
  const seen = new Set<string>();

  for (const dir of Object.values(DOMAIN_DIRS)) {
    const files = await listMarkdownFiles(path.join(projectPath, dir), projectPath);
    for (const rel of files) {
      if (!rel.endsWith('.md')) continue;
      try {
        const { content } = await readProjectFile(projectPath, rel, 120_000);
        const obsMatch = content.match(/## Observations\s*\n([\s\S]*?)(?=\n## |$)/);
        if (!obsMatch?.[1]) continue;
        for (const block of obsMatch[1].split(/\n-\s*\[/)) {
          const normalized = block.replace(/\s+/g, ' ').trim().slice(0, 200);
          if (!normalized || normalized.length < 30) continue;
          if (seen.has(normalized)) {
            const name = `sediment_${Date.now()}_${archived}.md`;
            await writeFile(path.join(archiveDir, name), `# Archived duplicate\n\n${block}\n`, 'utf8');
            archived += 1;
          } else {
            seen.add(normalized);
          }
        }
      } catch {
        /* skip */
      }
    }
  }
  return { archived };
}

export async function runMemoryMaintenance(projectPath: string) {
  const [indexes, routing, sediment] = await Promise.all([
    maintainActiveIndexes(projectPath),
    compactGongcaoRouting(projectPath),
    sedimentDuplicateObservations(projectPath),
  ]);
  return { indexes, routing, sediment };
}
