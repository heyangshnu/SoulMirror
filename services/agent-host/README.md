# fate-and-fortune

Agent-centered backend prototype for the fate-and-fortune direction.

The core product backend is intentionally shaped around:

```text
BaZi + Ziwei chart substrate
+ five-domain long-term personal memory
+ Claude Code as the business agent runtime
+ Basic Memory as the v0 person-memory substrate
+ MCP as the tool/storage surface
+ Fuxi / Gongcao / Luohan / Bodhisattva agent roles
```

Code in this project should stay thin. It may provide HTTP/WebSocket transport, process/session handling, event logging, MCP tool wiring, and chart calculation wrappers. It must not hardcode BaZi/Ziwei interpretation, five-axis business classification, memory-worthiness judgment, or content quality review.

The old PostgreSQL/DB MCP main-chain prototype has been removed from this subproject. The current v0 implementation path is Basic Memory-first:

```text
one person = one Basic Memory project
01_命 = Fuxi reports
02_愿 / 03_境 / 04_缘 / 05_力 = Luohan-managed memory
06_功曹 = raw facts, write-back candidates, tasks, Fuxi triggers
```

## First Run

Container-first:

```bash
cd fate-and-fortune
cp .env.example .env
docker compose build
docker compose up
```

Open:

```text
http://127.0.0.1:8787/tesla-demo
```

If `8787` is occupied on the host, keep the container internal port unchanged and only remap the host port:

```bash
PORT=8788 docker compose up
```

Then open:

```text
http://127.0.0.1:8788/tesla-demo
```

Local development:

```bash
cd fate-and-fortune
npm install
cp .env.example .env
npm run typecheck
npm run host
```

Supported MCP servers:

```bash
npm run mcp:chart
npm run mcp:methodology
```

## Runtime Shape

```text
/{slug} page
-> thin host
-> Claude Code Bodhisattva
-> Claude Code Gongcao
-> Claude Code Luohan/Fuxi
-> Basic Memory project
```

The host does not make business judgments. It only routes WebSocket messages, schedules explicitly named agents, records event streams, and passes through Gongcao route decisions. Business state is written by Claude Code agents through Basic Memory MCP or other explicitly configured MCP tools.

Every slug owns its own project:

```text
/app/memory-projects/{slug}/
```

Local development defaults to:

```text
runtime_spool/memory-projects/{slug}/
```

Runtime event logs are written under:

```text
runtime_spool/runs/{slug}/{runId}/
```

Each run records:

```text
turns.jsonl
agent-events.jsonl
tool-calls.jsonl
memory-diff.md
transcript.md
report.md
```

## Model Configuration

Only configure models and keys through environment variables:

```text
CLAUDE_MODEL_BODHISATTVA
CLAUDE_MODEL_GONGCAO
CLAUDE_MODEL_LUOHAN
CLAUDE_MODEL_FUXI
CLAUDE_FALLBACK_MODEL
FUXI_INIT_CONCURRENCY
FUXI_INIT_GATE
CLAUDE_CODE_FUXI_TIMEOUT_MS
MINIMAX_API_KEY
MINIMAX_ENABLED
MINIMAX_ANTHROPIC_BASE_URL
ARK_API_KEY
ARK_ANTHROPIC_BASE_URL
```

`FUXI_INIT_CONCURRENCY` defaults to `5`. It does not reduce the 16-node initialization set; it only limits how many heavy Fuxi/Claude Code processes run at the same time inside the container.

`FUXI_INIT_GATE` defaults to `core`. With `core`, only A01–A05 run on birth intake; the host emits `fuxi_init_chat_ready` / `fuxi_init_done` and leaves B/C/D nodes for lazy load via `POST /api/:slug/fuxi-run` or Gongcao `TRIGGER_FUXI`. Use `full` for strict 16/16 blocking init (Live 100 QA).

Bodhisattva/Gongcao/Luohan use MiniMax M3 first and may fall back to Ark `ark-code-latest` with a visible `provider_fallback` event. Set `MINIMAX_ENABLED=0` only for local validation when the MiniMax key is unavailable or known invalid. Fuxi uses Ark `deepseek-v4-pro`.

## Current Docs

Start with:

```text
docs/DESIGN_RATIONALE.md
docs/ARCHITECTURE.md
docs/BASIC_MEMORY_SYSTEM.md
docs/CLAUDE_CODE_AGENTS.md
docs/FUXI_ENGINE.md
docs/FUXI_NODE_SCHEDULE.md
docs/E2E_100_TURN_VALIDATION.md
```
