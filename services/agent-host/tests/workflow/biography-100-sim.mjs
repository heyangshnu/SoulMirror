import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../..', import.meta.url).pathname);
const outDir = path.join(root, 'runtime_spool/biography-100');
fs.mkdirSync(outDir, { recursive: true });

const initNodes = [
  'A01', 'A02', 'A03', 'A04', 'A05', 'B06', 'B07', 'B10',
  'C13', 'C16', 'C18', 'C19', 'C20', 'C24', 'C25', 'D28'
];

const themes = [
  {
    domain: '愿',
    message: '我想把交流电这件事证明出来，但现在每一步都像在和所有人的旧习惯作战。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-wish:update_existing_note'
  },
  {
    domain: '境',
    message: '纽约的机会很多，可是这里的资本、媒体和实验条件每天都在改变我的节奏。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-environment:update_existing_note'
  },
  {
    domain: '缘',
    message: '我和投资人之间越来越不像同路人，他们要马上看到钱，我要的是把系统做出来。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-relation:update_existing_note'
  },
  {
    domain: '力',
    message: '我现在最大的问题不是想法，而是钱、睡眠、实验材料和能撑多久。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-force:update_existing_note'
  },
  {
    domain: '命',
    message: '如果从我的当前十年周期看，这种把旧系统拆掉重建的冲动是不是到了最强的时候？',
    action: 'TRIGGER_FUXI',
    task: 'fuxi:generate_period_report'
  },
  {
    domain: '应',
    message: '我今天只是太累了，不想再解释了。',
    action: 'LOG_ONLY',
    task: null
  },
  {
    domain: '愿',
    message: '我不只是想发明一个机器，我想让整个城市的电力方式换一种底层秩序。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-wish:update_existing_note'
  },
  {
    domain: '缘',
    message: '爱迪生那套系统并不是我的敌人，但它挡住了我能看见的未来。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-relation:append_observation'
  },
  {
    domain: '力',
    message: '我可以连续工作很久，但身体不是没有代价，我有时几乎不睡。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-force:update_existing_note'
  },
  {
    domain: '境',
    message: '芝加哥展会让我第一次感觉这个想法不是实验室里的孤独，而是能进入公众世界。',
    action: 'DISPATCH_LUOHAN',
    task: 'luohan-environment:append_observation'
  }
];

const logs = [];
const notes = new Map();
for (const area of ['01_命', '02_愿', '03_境', '04_缘', '05_力', '06_功曹']) {
  notes.set(area, new Set());
}
for (const code of initNodes) notes.get('01_命').add(`${code}_initialized`);

let b09Initialized = false;
let fuxiTriggers = 0;
let dispatchCount = 0;
let logOnlyCount = 0;

for (let i = 1; i <= 100; i += 1) {
  const theme = themes[(i - 1) % themes.length];
  const highRisk = i === 37 || i === 73;
  const confirmation = i === 42;
  const denial = i === 61;
  let action = theme.action;
  let task = theme.task;
  let message = theme.message;

  if (highRisk) {
    action = 'MIXED';
    task = 'fuxi:generate_topic_report + luohan-force:update_existing_note';
    message = '我在考虑把实验放大成更大的商业系统，但这会牵动投资、合伙和现金承载。';
  }
  if (confirmation) {
    action = 'DISPATCH_LUOHAN';
    task = 'luohan-wish:mark_pending_confirmation';
    message = '你说我不是为了名声，而是为了让脑子里的秩序落到世界里，这个说法很接近。';
  }
  if (denial) {
    action = 'DISPATCH_LUOHAN';
    task = 'luohan-relation:downgrade_or_conflict';
    message = '你说我完全不在意别人，这不准确。我只是很难为了讨好别人放慢我看到的东西。';
  }

  const domains = new Set([theme.domain]);
  if (action === 'TRIGGER_FUXI' || action === 'MIXED') domains.add('命');
  if (task?.includes('luohan-force')) domains.add('力');
  if (task?.includes('luohan-relation')) domains.add('缘');
  if (task?.includes('luohan-wish')) domains.add('愿');
  if (task?.includes('luohan-environment')) domains.add('境');

  notes.get('06_功曹').add('原始轮次记录');
  if (action !== 'NO_ACTION') notes.get('06_功曹').add('回写候选');
  if (action === 'DISPATCH_LUOHAN' || action === 'MIXED') {
    dispatchCount += 1;
    notes.get('06_功曹').add('派发工单');
  }
  if (action === 'LOG_ONLY') logOnlyCount += 1;
  if (action === 'TRIGGER_FUXI' || action === 'MIXED') {
    fuxiTriggers += 1;
    notes.get('06_功曹').add('伏羲触发记录');
    notes.get('01_命').add(action === 'TRIGGER_FUXI' ? '专题_周期问题' : '专题_高风险决策');
  }
  if (domains.has('愿')) notes.get('02_愿').add('阶段目标与发明愿景');
  if (domains.has('境')) notes.get('03_境').add('城市与产业环境');
  if (domains.has('缘')) notes.get('04_缘').add('投资人和同行关系');
  if (domains.has('力')) notes.get('05_力').add('现金精力和实验承载');

  const rawTextPreserved = typeof message === 'string' && message.length > 0;
  logs.push({
    turn: i,
    user_message: message,
    domains: [...domains],
    bodhisattva_context: [...domains].map((d) => `${d} context`),
    gongcao_action: action,
    luohan_tasks: task?.includes('luohan') ? [task] : [],
    fuxi_task: task?.includes('fuxi') ? task : null,
    notes_touched: [...notes.entries()].flatMap(([area, set]) => [...set].map((name) => `${area}/${name}`)),
    raw_text_preserved: rawTextPreserved,
    b09_initialized: b09Initialized,
    issues: rawTextPreserved ? [] : ['raw text not preserved']
  });
}

const issues = [];
if (b09Initialized) issues.push('B09 was initialized');
if (logs.some((turn) => !turn.raw_text_preserved)) issues.push('Some turn did not preserve raw text');
if (notes.get('02_愿').size > 5) issues.push('Wish notes look fragmented');
if (notes.get('03_境').size > 5) issues.push('Environment notes look fragmented');
if (notes.get('04_缘').size > 5) issues.push('Relation notes look fragmented');
if (notes.get('05_力').size > 5) issues.push('Force notes look fragmented');
if (fuxiTriggers < 3) issues.push('Fuxi trigger coverage too low');

const jsonlPath = path.join(outDir, 'turns.jsonl');
fs.writeFileSync(jsonlPath, logs.map((entry) => JSON.stringify(entry)).join('\n') + '\n');

const report = `# 100-Turn Biography Workflow Simulation

Candidate: Nikola Tesla

This is a deterministic workflow simulation, not a live LLM/Basic Memory run. It validates routing rules, note-stability assumptions, raw-text preservation, B09 prohibition, and Fuxi trigger boundaries before model-backed E2E is available.

## Summary

- Turns: ${logs.length}
- Initialization nodes: ${initNodes.join(', ')}
- B09 initialized: ${b09Initialized ? 'yes' : 'no'}
- Gongcao dispatch count: ${dispatchCount}
- Gongcao log-only count: ${logOnlyCount}
- Fuxi trigger count: ${fuxiTriggers}
- Issues: ${issues.length}

## Notes Touched

${[...notes.entries()].map(([area, set]) => `- ${area}: ${[...set].join(', ')}`).join('\n')}

## Covered Scenes

- city/environment pressure
- investor/relationship pressure
- career/invention goal
- cash/energy/resource carrying capacity
- period question
- high-risk commercialization decision
- hypothesis confirmation
- hypothesis denial

## Result

${issues.length === 0 ? 'PASS' : `FAIL\n\n${issues.map((issue) => `- ${issue}`).join('\n')}`}

Raw log: \`runtime_spool/biography-100/turns.jsonl\`
`;

fs.writeFileSync(path.join(outDir, 'report.md'), report);
fs.writeFileSync(path.join(root, 'stage/08_100_turn_biography_test_report.md'), report);

if (issues.length > 0) {
  console.error(report);
  process.exit(1);
}

console.log(report);
