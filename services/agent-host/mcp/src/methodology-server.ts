import 'dotenv/config';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  asString,
  numberProp,
  objectSchema,
  optionalString,
  startMcpServer,
  stringProp,
  type ToolSpec,
} from './common.js';

const root = path.resolve(process.env.METHODOLOGY_ROOT ?? path.join(process.cwd(), 'methodology'));

function safePath(relativePath: string) {
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root)) {
    throw new Error('Path escapes methodology root.');
  }
  return resolved;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith('.md')) return [full];
    return [];
  }));
  return files.flat();
}

const tools: ToolSpec[] = [
  {
    name: 'methodology.read',
    description: 'Read a Method Book markdown file by relative path.',
    inputSchema: objectSchema({ path: stringProp() }, ['path']),
    handler: async (args) => {
      const filePath = safePath(asString(args.path, 'path'));
      const content = await readFile(filePath, 'utf8');
      return { path: path.relative(root, filePath), content };
    },
  },
  {
    name: 'methodology.list',
    description: 'List Method Book files under an optional section.',
    inputSchema: objectSchema({ section: stringProp() }),
    handler: async (args) => {
      const section = optionalString(args.section) ?? '';
      const dirPath = safePath(section);
      const info = await stat(dirPath);
      const files = info.isDirectory() ? await walk(dirPath) : [dirPath];
      return files.map((file) => path.relative(root, file)).sort();
    },
  },
  {
    name: 'methodology.search',
    description: 'Simple text search over Method Book markdown files.',
    inputSchema: objectSchema({ query: stringProp(), limit: numberProp(), section: stringProp() }, ['query']),
    handler: async (args) => {
      const query = asString(args.query, 'query').toLowerCase();
      const limit = Math.min(typeof args.limit === 'number' ? args.limit : 20, 100);
      const section = optionalString(args.section) ?? '';
      const files = await walk(safePath(section));
      const matches: Array<{ path: string; preview: string }> = [];
      for (const file of files) {
        const content = await readFile(file, 'utf8');
        const index = content.toLowerCase().indexOf(query);
        if (index >= 0) {
          const start = Math.max(0, index - 160);
          const end = Math.min(content.length, index + query.length + 240);
          matches.push({
            path: path.relative(root, file),
            preview: content.slice(start, end).replace(/\s+/g, ' ').trim(),
          });
        }
        if (matches.length >= limit) break;
      }
      return matches;
    },
  },
];

await startMcpServer('fate-and-fortune-methodology', '0.1.0', tools);
