# Implementation Status

Updated: 2026-06-13

## Completed

- Consolidated the current architecture, memory model, Agent boundaries, Fuxi schedule, and E2E plan under `docs/`.
- Added stage schedules under `stage/`.
- Kept `fate-and-fortune` independent from the root workspace. The root `package.json` is not coupled to this prototype.
- Removed the old PostgreSQL / DB MCP main-chain prototype:
  - no `db/`.
  - no `mcp/src/db-server.ts`.
  - no `mcp/src/runtime-server.ts`.
  - no old `claude-code/` DB config.
  - no old `skills/` directory.
  - no `pg`, `@types/pg`, `mcp:db`, or `mcp:runtime`.
- Kept only the non-business MCP tools needed by the current chain:
  - Chart MCP.
  - Methodology MCP.
- Added deterministic L0 Chart Asset hard step:
  - BaZi facts from `lunar-javascript`.
  - Ziwei facts from `iztro`.
  - `chart_asset_id` generated once per birth/calculation profile.
  - JSON + Markdown written under `01_命/_chart_assets/`.
  - `01_命/L0_排盘事实档案.md` written before Fuxi starts.
- Added role-scoped memory MCP wrapper:
  - `memory.read_*`
  - `memory.write_gongcao`
  - `memory.write_fuxi`
  - `memory.write_luohan_wish`
  - `memory.write_luohan_environment`
  - `memory.write_luohan_relation`
  - `memory.write_luohan_force`
- Added Claude Code-ready Agents:
  - Bodhisattva.
  - Gongcao.
  - Wish / Environment / Relation / Force Luohan.
  - Fuxi thin dispatch Agent.
- Imported all 50 Fuxi prompt nodes into `fuxi-nodes/`.
- Initialized only the 16 agreed Fuxi foundation nodes.
- Kept B09 as on-demand only and blocked it from initialization.
- Added Basic Memory person-project layout:
  - `00_soul/`
  - `01_命/`
  - `02_愿/`
  - `03_境/`
  - `04_缘/`
  - `05_力/`
  - `06_功曹/`
  - `07_上下文包/`
  - `08_归档/`
- Added the `/{slug}` page and WebSocket runtime:
  - `GET /`
  - `GET /{slug}`
  - `GET /api/{slug}/status`
  - `GET /health`
  - `WS /ws?slug={slug}`
- Added full run logs:
  - `turns.jsonl`
  - `agent-events.jsonl`
  - `tool-calls.jsonl`
  - `memory-diff.md`
  - `transcript.md`
  - `report.md`
- Added realistic Tesla-perspective 100-turn live harness:
  - `tests/fixtures/tesla-realistic-user-turns.zh.mjs`
  - `tests/workflow/live-tesla-100.mjs`
- Added `docs/USER_EXPRESSION_RESEARCH.md` so test prompts use normal user speech instead of internal architecture language.

## Container Status

The container is now named and packaged as:

```text
container_name: fate-and-fortune
image: fate-and-fortune:local
```

Runtime state is isolated into mounted volumes:

```text
/app/runtime
/app/memory-projects
```

Claude Code, Basic Memory, home, temp, and cache paths are forced under `/app/runtime`:

```text
/app/runtime/claude-code
/app/runtime/basic-memory
/app/runtime/home
/app/runtime/tmp
/app/runtime/cache
```

This avoids writing large Claude Code / provider / cache artifacts into the container writable layer.

## Fixes From Live Attempts

- Changed direct-call Agents from `mode: subagent` to `mode: primary`, because Host invokes them with `claude-code run --agent`.
- Isolated Claude Code session state per `slug + agent/sessionKey` to avoid concurrent SQLite migration collisions.
- Made Fuxi initialization fail fast at the workflow level: if any foundation node fails, the conversation does not continue as if the chart base exists.
- Added Fuxi initialization backpressure with `FUXI_INIT_CONCURRENCY=5` by default. This still runs all 16 nodes; it only limits how many heavy Claude Code/Fuxi processes run at the same time.
- Added stream error handlers for Claude Code `events.jsonl` and `stderr.log` so filesystem errors are reported through the event stream instead of crashing silently.
- Changed the live harness to wait for aggregate `fuxi_init_done` / `fuxi_init_failed`, not the first per-node `agent_error`.
- Switched the container base image to native multi-arch `node:22-trixie` via the DaoCloud mirror, so local arm64 runs no longer depend on amd64/qemu.
- Installed `basic-memory==0.22.0` on Python 3.13 in the container.
- Made the container entrypoint repair volume ownership as root, then drop to `smqt` with `gosu`.
- Set `BASIC_MEMORY_BIN=/opt/basic-memory/bin/basic-memory`, so Host does not depend on shell PATH.
- Configured Fuxi against Ark Agent Plan:
  - `CLAUDE_MODEL_FUXI=deepseek-v4-pro`
  - `ARK_ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/plan`
- Treated Ark CodingPlan model capability and subscription errors as fatal provider errors, so Fuxi initialization aborts after the in-flight nodes and skips the remaining nodes.
- Added role-level Claude Code hard timeouts and process-group cleanup.
- Tightened Luohan prompts so every note path returned by search/list/build_context is read through `memory.read_note`, not Claude Code built-in `Read`.

## Validation Evidence

Commands that should pass before each live run:

```bash
npm run validate:static
npm run typecheck
npm run build
docker compose build
docker compose up -d
curl -sS http://127.0.0.1:8787/health
curl -sS http://127.0.0.1:8787/api/tesla-demo/status
```

The live 100-turn run is:

```bash
npm run test:live:tesla100
```

Latest container validation:

```text
container: fate-and-fortune
health: ok
page: http://127.0.0.1:8787/tesla-demo
Basic Memory: ok
runtime data: /app/runtime
memory project: /app/memory-projects/tesla-demo
node: v22.22.3
python: 3.13.5
claude-code: 1.0.128
basic-memory: 0.22.0
container process user: smqt
smqt volume write check: ok
```

Latest live validation:

```text
tests/output/live-tesla-100-turns-82-100-2026-06-13T21-20-06-633Z.jsonl
tests/output/live-tesla-100-turns-82-100-2026-06-13T21-20-06-633Z.summary.json

turns: 82-100
events: 2095
agent_started: 151
tool_call: 1227
agent_done: 151
assistant_message: 20
gongcao_dispatch: 65
luohan_receipt: 66
contract_errors: 0
config_errors: 0
provider_fallbacks: 0
chart_asset_done: 1
fuxi_node_done: 16
fuxi_node_error: 0
```

The full 100-turn validation was completed by resuming across live segments after fixing real defects found during the run. The final segment completed turns 82-100 cleanly after the timeout and MCP-read fixes.

## Current Live Blockers

No live blocker remains for the validated local prototype.

No model key is written into code, docs, notes, logs, or Agent files.

Open performance work remains:

- Gongcao receipt registration and routing memory reads can exceed 100 seconds.
- `06_功曹/routing-memory.md` and JSONL logs need compaction/indexing before productization.
- Per-domain active context packs should reduce repeated `memory.read_note` calls.

## Important Boundaries Preserved

- No B09 initialization path.
- No PostgreSQL / DB MCP business chain.
- No host-side business judgment about memory worthiness, five-domain classification, or chart interpretation.
- Basic Memory remains Markdown true source for this prototype.
- Host only routes, schedules, records events, and exposes the page.
