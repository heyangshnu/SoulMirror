import 'dotenv/config';
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  arrayProp,
  asArray,
  asString,
  objectSchema,
  optionalString,
  startMcpServer,
  stringProp,
  type ToolSpec,
} from './common.js';

const memoryHome = path.resolve(process.env.BASIC_MEMORY_HOME || process.env.MEMORY_PROJECT_PATH || process.cwd());

const writeScopes = {
  'memory.write_gongcao': '06_功曹',
  'memory.write_fuxi': '01_命',
  'memory.write_luohan_wish': '02_愿',
  'memory.write_luohan_environment': '03_境',
  'memory.write_luohan_relation': '04_缘',
  'memory.write_luohan_force': '05_力',
} as const;

const tools: ToolSpec[] = [
  {
    name: 'memory.read_note',
    description: 'Read a Markdown or JSON note from the current person memory project. Read-only. Large notes are truncated unless maxChars is "full".',
    inputSchema: objectSchema({
      path: stringProp('Project-relative path, for example 01_命/L0_排盘事实档案.md'),
      maxChars: stringProp('Optional numeric string; default 6000. Use "full" only for Fuxi deep work or chart assets that truly need full content.'),
    }, ['path']),
    handler: async (args) => {
      const rel = normalizeRelativePath(asString(args.path, 'path'));
      const full = resolveProjectPath(rel);
      const content = await readFile(full, 'utf8');
      const maxChars = parseMaxChars(optionalString(args.maxChars) ?? undefined, 6000);
      const truncated = maxChars !== null && content.length > maxChars;
      return {
        path: rel,
        content: truncated ? content.slice(0, maxChars) : content,
        contentLength: content.length,
        truncated,
      };
    },
  },
  {
    name: 'memory.list_notes',
    description: 'List Markdown and JSON files in allowed person memory folders. Read-only.',
    inputSchema: objectSchema({
      folders: arrayProp('Optional folder filters, for example ["01_命", "02_愿"]'),
    }),
    handler: async (args) => {
      const folders = folderFilters(args.folders);
      const files = (await Promise.all(folders.map((folder) => listFiles(path.join(memoryHome, folder), memoryHome)))).flat();
      return { memoryHome, files: files.sort() };
    },
  },
  {
    name: 'memory.search_notes',
    description: 'Search project Markdown/JSON files by plain text. Read-only.',
    inputSchema: objectSchema({
      query: stringProp(),
      folders: arrayProp(),
      maxResults: stringProp('Optional numeric string; default 8'),
      maxSnippetChars: stringProp('Optional numeric string; default 700'),
    }, ['query']),
    handler: async (args) => searchNotes(
      asString(args.query, 'query'),
      folderFilters(args.folders),
      Number(optionalString(args.maxResults) ?? 8),
      Number(optionalString(args.maxSnippetChars) ?? 700),
    ),
  },
  {
    name: 'memory.build_context',
    description: 'Build a compact context pack from matching project notes. Read-only.',
    inputSchema: objectSchema({
      query: stringProp(),
      folders: arrayProp(),
      maxChars: stringProp('Optional numeric string; default 6000'),
    }, ['query']),
    handler: async (args) => {
      const maxChars = Number(optionalString(args.maxChars) ?? 6000);
      const result = await searchNotes(asString(args.query, 'query'), folderFilters(args.folders), 12, 700);
      const sections = result.results.map((item) => [
        `## ${item.path}`,
        item.snippet,
      ].join('\n\n'));
      return {
        query: result.query,
        context: sections.join('\n\n---\n\n').slice(0, Number.isFinite(maxChars) ? maxChars : 6000),
        sourceCount: result.results.length,
        sources: result.results.map((item) => item.path),
      };
    },
  },
  ...Object.entries(writeScopes).map(([name, folder]) => writeTool(name, folder)),
];

await startMcpServer('fate-and-fortune-memory', '0.1.0', tools);

function writeTool(name: string, folder: string): ToolSpec {
  return {
    name,
    description: `Write or append a Markdown note or JSONL audit file only under ${folder}. Path is enforced by the MCP wrapper.`,
    inputSchema: objectSchema({
      path: stringProp(`Path relative to ${folder}; may include nested directories.`),
      content: stringProp('Markdown content to write or append. Preserve user originals explicitly.'),
      mode: stringProp('create | append | overwrite. Default append.'),
    }, ['path', 'content']),
    handler: async (args) => {
      let relWithinScope = normalizeRelativePath(asString(args.path, 'path'));
      const scopePrefix = `${folder}${path.sep}`;
      if (relWithinScope === folder) throw new Error(`path must name a Markdown file inside ${folder}`);
      if (relWithinScope.startsWith(scopePrefix)) relWithinScope = relWithinScope.slice(scopePrefix.length);
      const content = asString(args.content, 'content');
      const mode = optionalString(args.mode) ?? 'append';
      if (!['create', 'append', 'overwrite'].includes(mode)) throw new Error('mode must be create, append, or overwrite');
      const projectRel = path.join(folder, relWithinScope);
      if (!projectRel.endsWith('.md') && !projectRel.endsWith('.jsonl')) {
        throw new Error('role-scoped memory writes must target Markdown or JSONL files');
      }
      const full = resolveProjectPath(projectRel);
      await mkdir(path.dirname(full), { recursive: true });
      if (mode === 'create') {
        try {
          await stat(full);
          throw new Error(`note already exists: ${projectRel}`);
        } catch (error) {
          if (error instanceof Error && !('code' in error)) throw error;
        }
      }
      if (mode === 'overwrite' || mode === 'create') await writeFile(full, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
      else await appendFile(full, `\n\n${content.endsWith('\n') ? content : `${content}\n`}`, 'utf8');
      return { ok: true, path: projectRel, scope: folder, mode };
    },
  };
}

async function searchNotes(query: string, folders: string[], maxResults: number, maxSnippetChars = 700) {
  const lower = query.toLowerCase();
  const files = (await Promise.all(folders.map((folder) => listFiles(path.join(memoryHome, folder), memoryHome)))).flat();
  const results: Array<{ path: string; score: number; snippet: string }> = [];
  for (const rel of files) {
    const content = await readFile(resolveProjectPath(rel), 'utf8');
    const lowerContent = content.toLowerCase();
    const index = lowerContent.indexOf(lower);
    const score = index >= 0 ? 10 : tokenScore(lower, lowerContent);
    if (score <= 0) continue;
    const snippetChars = Number.isFinite(maxSnippetChars) && maxSnippetChars > 0 ? maxSnippetChars : 700;
    const start = index >= 0 ? Math.max(0, index - Math.floor(snippetChars / 3)) : 0;
    results.push({
      path: rel,
      score,
      snippet: content.slice(start, start + snippetChars),
    });
  }
  results.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return {
    query,
    results: results.slice(0, Number.isFinite(maxResults) && maxResults > 0 ? maxResults : 12),
  };
}

function parseMaxChars(value: string | undefined, defaultValue: number): number | null {
  if (!value) return defaultValue;
  if (value.trim().toLowerCase() === 'full') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function tokenScore(query: string, content: string) {
  const tokens = Array.from(new Set(query.split(/[\s,，。！？；:：、]+/u).map((item) => item.trim()).filter((item) => item.length >= 2)));
  return tokens.reduce((score, token) => score + (content.includes(token) ? 1 : 0), 0);
}

async function listFiles(dir: string, base: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const out: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await listFiles(full, base));
      else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json') || entry.name.endsWith('.jsonl'))) out.push(path.relative(base, full));
    }
    return out;
  } catch {
    return [];
  }
}

function folderFilters(value: unknown) {
  const requested = asArray(value).filter((item): item is string => typeof item === 'string' && item.trim() !== '');
  const roots = ['00_soul', '01_命', '02_愿', '03_境', '04_缘', '05_力', '06_功曹', '07_上下文包', '08_归档'];
  if (requested.length === 0) return roots;
  return requested.map((item) => {
    const folder = normalizeRelativePath(item).split(path.sep)[0];
    if (!roots.includes(folder)) throw new Error(`folder is outside allowed memory roots: ${item}`);
    return folder;
  });
}

function normalizeRelativePath(input: string) {
  const normalized = path.normalize(input).replace(/^[/\\]+/, '');
  if (!normalized || normalized === '.' || normalized === '..' || normalized.startsWith(`..${path.sep}`) || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`invalid memory path: ${input}`);
  }
  return normalized;
}

function resolveProjectPath(rel: string) {
  const full = path.resolve(memoryHome, rel);
  if (full !== memoryHome && !full.startsWith(`${memoryHome}${path.sep}`)) throw new Error('memory path escaped project root');
  return full;
}
