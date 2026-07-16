import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function readLatestTranscript(runtimeRoot: string, slug: string, limit = 50) {
  const runsDir = path.join(runtimeRoot, 'runs', slug);
  let entries: string[] = [];
  try {
    entries = await readdir(runsDir);
  } catch {
    return { ok: true, lines: [], content: '' };
  }

  const runs = await Promise.all(
    entries.map(async (name) => {
      const full = path.join(runsDir, name);
      const info = await stat(full);
      return { name, full, mtime: info.mtimeMs };
    }),
  );
  runs.sort((a, b) => b.mtime - a.mtime);
  const latest = runs[0];
  if (!latest) return { ok: true, lines: [], content: '' };

  const transcriptPath = path.join(latest.full, 'transcript.md');
  let content = '';
  try {
    content = await readFile(transcriptPath, 'utf8');
  } catch {
    return { ok: true, runId: latest.name, lines: [], content: '' };
  }

  const chunks = content
    .split(/\n## /)
    .filter(Boolean)
    .slice(-limit)
    .map((block) => (block.startsWith('## ') ? block : `## ${block}`));

  return {
    ok: true,
    runId: latest.name,
    content: chunks.join('\n\n'),
    lines: chunks,
  };
}
