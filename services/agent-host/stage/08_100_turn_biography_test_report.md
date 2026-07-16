# 100-Turn Biography Live Validation

Candidate: Nikola Tesla

This report records the real Claude Code + Basic Memory chain, not the earlier deterministic simulation. The run used `/tesla-demo`, real containerized Claude Code workers, real MCP calls, real Markdown writes, and the Tesla-perspective Chinese user fixture.

## Result

PASS after iterative fixes.

The complete validation was resumed across multiple live segments because earlier runs exposed real defects. The final clean recovery segment covered turns 82-100 and completed without contract/config/runtime errors.

Primary final evidence:

```text
tests/output/live-tesla-100-turns-82-100-2026-06-13T21-20-06-633Z.jsonl
tests/output/live-tesla-100-turns-82-100-2026-06-13T21-20-06-633Z.summary.json
```

Final segment summary:

```text
turns: 82-100
events: 2095
agent_started: 151
agent_done: 151
tool_call: 1227
assistant_message: 20
post_turn_packet: 19
gongcao_dispatch: 65
luohan_receipt: 66
background_idle: 19
contract_errors: 0
config_errors: 0
provider_fallbacks: 0
chart_asset_done: 1
fuxi_node_done: 16
fuxi_node_error: 0
```

## Initialization

Fuxi foundation was present and reusable before the resumed live segment:

```text
A01 本命总解
A02 八字气候报告
A03 紫微生命地图
A04 一生命势报告
A05 命盘机制卡报告
B06 全生命周期大运大限报告
B07 当前十年深解
B10 当前流年报告
C13 事业成事报告
C16 财富资源报告
C18 合作团队报告
C19 学习认知报告
C20 表达内容报告
C24 健康精力报告
C25 福德内在报告
D28 亲密关系报告
```

B09 check:

```text
B09 initialized: no
全生命周期流年报告 initialized: no
```

L0 chart asset persisted under:

```text
01_命/_chart_assets/chart_75c85fb5cf44644091e7008a.json
01_命/_chart_assets/chart_75c85fb5cf44644091e7008a.md
01_命/L0_排盘事实档案.md
01_命/L0_模型事实上下文.md
```

## Main Flow Observed

Observed sequence matched the intended loop:

```text
User
-> Bodhisattva reads Basic Memory and replies
-> post_turn_packet
-> Gongcao reads routing memory, writes 06_功曹, dispatches lightly
-> one or more Luohan agents maintain their own domain topic networks
-> Luohan receipts return
-> Gongcao records receipts as LOG_ONLY unless retry is needed
```

Final segment route counts:

```text
DISPATCH_LUOHAN: 19
LOG_ONLY: 46
Fuxi on-demand tasks: 0
```

This is correct for the tested reality-chat turns: Fuxi remained the chart foundation and was not over-triggered by ordinary reality memory.

## Memory Growth Observed

Tesla live turns naturally grew topic networks around the user's language:

```text
02_愿/L0_理想生活.md
02_愿/L1_阶段目标.md
03_境/家乡作为根与校准点.md
03_境/外界比较环境.md
04_缘/关系模式.md
04_缘/血缘关系_家人.md
05_力/人脉信用力.md
05_力/可试错额度.md
05_力/精力健康力.md
05_力/力量总览.md
06_功曹/routing-memory.md
```

Examples of naturally grown themes:

```text
家乡作为根与校准点
精神上的家
老关系维护与自然淡化
台前/台后边界
名声只做入口，不做方向盘
最终愿景作方向盘，眼前证明作台前入口
```

## Issues Found And Fixed

1. `gongcao` receipt registration could hang for multiple minutes.
   - Fix: added role-level Claude Code hard timeouts and process-group termination.
   - Verification: resumed from turn 81/82 and completed turns 82-100.

2. `luohan-wish` used Claude Code built-in `Read` after seeing note paths.
   - Fix: clarified Luohan prompts and dynamic batch prompt: note paths must be passed into `memory.read_note`.
   - Verification: reran turn 82; Luohan agents used `mcp__fate_memory__memory_read_note`, with zero contract errors afterward.

3. Performance remains slow as memory grows.
   - Evidence: final segment slowest runs included `gongcao` at 111s/104s/103s and `luohan-wish` at 102s.
   - Status: accepted for prototype validation; should be optimized with active indexes/context packs before productization.

## Validation Commands

```bash
npm run typecheck
npm run validate:static
npm run build
docker compose build
docker compose up -d --force-recreate
FATE_TEST_START_INDEX=81 npm run test:live:tesla100
```

Additional audit:

```bash
rg -n "agent_contract_error|config_error|gongcao_route_error|gongcao_error|fuxi_node_error|provider_fallback|chart_asset_error" tests/output/live-tesla-100-turns-82-100-2026-06-13T21-20-06-633Z.jsonl
find /app/memory-projects/tesla-demo -name "*B09*" -o -name "*全生命周期流年*"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/tesla-demo
```

## Residual Work

- Reduce `06_功曹/routing-memory.md` and JSONL growth through compact route indexes.
- Add per-domain active index/context pack to reduce repeated `memory.read_note` calls.
- Make memory-diff attribution cleaner under parallel Luohan writes; receipt paths are currently the authoritative source.
- Decide whether Gongcao receipt batches should be compacted without changing its light-dispatch role.
