# Stage 03 Claude Code Agents

Status: completed-configured

## Deliverables

```text
agents/bodhisattva.md
agents/gongcao.md
agents/luohan-wish.md
agents/luohan-environment.md
agents/luohan-relation.md
agents/luohan-force.md
agents/fuxi.md
commands/*
AGENTS.md
host/src/claude-code-runner.ts
host/src/claude-code-runner.ts
```

## Required Fixes

- Remove hardcoded model names.
- Tighten Bodhisattva write boundary.
- Add Gongcao raw fact store.
- Add Fuxi thin dispatcher.
- Add Fuxi commands.
- Add raw-text-first rule.
- Keep project config at root `host/src/claude-code-runner.ts`; `agents` is for agents/commands, not the main config file.

## Acceptance

- Agents can be discovered by file.
- Each Agent has clear write boundary.
- Every Agent ends tasks with `AGENT_TASK_COMPLETE`.
