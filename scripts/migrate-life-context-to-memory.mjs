#!/usr/bin/env node
/**
 * Migrate Mongo life_context → agent-host Basic Memory (02_愿 / 03_境).
 *
 * Usage:
 *   MONGODB_URI=... AGENT_HOST_URL=http://127.0.0.1:8787 MEMORY_WRITE_SECRET=... node scripts/migrate-life-context-to-memory.mjs
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/soulmirror';
const agentBase = (process.env.AGENT_HOST_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const writeKey = process.env.MEMORY_WRITE_SECRET || '';

const lifeSchema = new mongoose.Schema({}, { strict: false, collection: 'lifecontexts' });
const LifeContext = mongoose.model('LifeContextMigrate', lifeSchema);

function slug(userId) {
  return `u_${userId}`;
}

function noteRel(domainDir, title) {
  const safe = String(title).replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 40);
  return `${domainDir}/migrated_${safe}.md`;
}

async function writeNote(userId, rel, body) {
  if (!writeKey) {
    console.log(`[skip-write] user=${userId} rel=${rel} (set MEMORY_WRITE_SECRET)`);
    return { skipped: true };
  }
  const s = slug(userId);
  const res = await fetch(`${agentBase}/api/${encodeURIComponent(s)}/notes`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-memory-write-key': writeKey,
    },
    body: JSON.stringify({ rel, content: body }),
  });
  if (!res.ok) throw new Error(`write ${rel} → ${res.status}`);
  return res.json();
}

async function main() {
  await mongoose.connect(uri);
  const rows = await LifeContext.find({}).lean();
  let count = 0;
  for (const row of rows) {
    const userId = String(row.userId);
    const parts = [];
    if (row.currentState) parts.push(`当前状态：${row.currentState}`);
    if (row.focusDirection) parts.push(`关注方向：${row.focusDirection}`);
    if (row.weeklyFocus) parts.push(`本周焦点：${row.weeklyFocus}`);
    if (row.chatSummary) parts.push(`## Summary\n${row.chatSummary}`);
    if (row.freeText) parts.push(row.freeText);
    if (!parts.length) continue;
    const body = `---\nstatus: active\nsource: life_context_migration\n---\n\n# 生活背景\n\n${parts.join('\n\n')}\n`;
    await writeNote(userId, noteRel('02_愿', 'life_context'), body);
    if (row.chatPatterns?.summary) {
      const jingBody = `---\nstatus: active\nsource: life_context_migration\n---\n\n# 对话模式\n\n## Summary\n${row.chatPatterns.summary}\n`;
      await writeNote(userId, noteRel('03_境', 'chat_patterns'), jingBody);
    }
    count += 1;
  }
  console.log(`Migrated ${count} life_context documents.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
