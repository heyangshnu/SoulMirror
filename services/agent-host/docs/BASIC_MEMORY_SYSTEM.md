# Basic Memory System

Basic Memory is the v0 memory substrate. Markdown remains the business source of truth.

```text
Basic Memory
= Markdown-first true source
+ index/search layer
+ observations
+ relations
+ role-scoped MCP wrapper
+ Obsidian-readable files
```

## Why Basic Memory

We chose Basic Memory because it matches the current Agent-centered design:

- Claude Code agents naturally read and write Markdown.
- Human reviewers can inspect notes directly.
- Observations and relations can represent light graph structure.
- MCP tools avoid building our own memory service in v0.
- One project per person gives clean isolation.

## What Basic Memory Is Not

Basic Memory is not allowed to become a junk transcript store.

Do not:

- write every turn into a new note.
- let Bodhisattva write long-term memory.
- let Gongcao rewrite domain facts.
- let Agents invent relation types.
- rely on a large graph dump as the model context.

## Project Layout

```text
00_soul/
01_命/
02_愿/
03_境/
04_缘/
05_力/
06_功曹/
07_上下文包/
08_归档/
```

`00_soul/` stores readable backups of Agent souls. Actual Claude Code agent files live in `agents/`.

`01_命/` stores Fuxi reports and chart reference notes.

`02_愿/` stores vision, long goals, short goals, and execution notes.

`03_境/` stores external environment notes.

`04_缘/` stores relationship notes.

`05_力/` stores capacity/resource notes.

`06_功曹/` stores raw turns, write-back candidates, dispatch tasks, Fuxi triggers, and completion receipts.

`07_上下文包/` stores temporary/debug context packs.

`08_归档/` stores outdated stages, old hypotheses, and completed goals.

## Tool Policy

Claude Code Agents do not receive the generic Basic Memory MCP writer. They use the project-local `fate_memory` MCP wrapper:

- `memory.search_notes`
- `memory.read_note`
- `memory.build_context`
- `memory.list_notes`
- `memory.write_gongcao`
- `memory.write_fuxi`
- `memory.write_luohan_wish`
- `memory.write_luohan_environment`
- `memory.write_luohan_relation`
- `memory.write_luohan_force`

Agent permission:

- Bodhisattva: read/search/build_context/list only.
- Gongcao: read/search/build_context/list plus `memory.write_gongcao`, enforced under `06_功曹/`.
- Luohan: read/search/build_context/list plus exactly one matching `memory.write_luohan_*`, enforced under own domain.
- Fuxi: read/search/build_context/list plus `memory.write_fuxi`, enforced under `01_命/`.

Basic Memory CLI is still used by Host for local project registration/status. Its internal SQLite index is an implementation detail, not a business database.

## Container Runtime

In the container, Basic Memory is installed as:

```text
basic-memory==0.22.0
```

The host does not use the host machine's `~/basic-memory` or global config. Each slug receives an isolated project and config:

```text
/app/memory-projects/{slug}
/app/runtime/basic-memory/{slug}/config
/app/runtime/basic-memory/fastembed-cache
```

Local development mirrors this under:

```text
runtime_spool/memory-projects/{slug}
runtime_spool/basic-memory/{slug}/config
runtime_spool/basic-memory/fastembed-cache
```

Basic Memory may internally use SQLite for indexing. In this design that SQLite file is an implementation detail of Basic Memory, not the business database and not an exposed system dependency. Markdown remains the memory source of truth.

## Context Pack

`memory.build_context` is a retrieval tool, not the final reasoning context. Each Agent still compresses retrieved notes into its own working context.

菩萨 Context Pack:

```markdown
# Context Pack

## 当前问题
## 命盘参照
## 愿
## 境
## 缘
## 力
## 待印证
## 回答时要谨慎的点
```

## Snapshot and Defrag

Use periodic reflection:

- every 10-20 meaningful turns: merge repeated observations.
- weekly or every high-density session: update summaries.
- monthly or stage transition: write phase summary.
- when entering new year/period: consider Fuxi F1 task.

The goal is fewer better notes, not more notes.
