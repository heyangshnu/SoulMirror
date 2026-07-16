# Stage 07 E2E Validation

Status: active-live

## Checks

- Host serves `/health`.
- Host serves `/{slug}` page.
- Host serves `/api/{slug}/status`.
- WebSocket accepts `/ws?slug={slug}`.
- Container name is `fate-and-fortune`.
- Runtime, home, temp, cache, Claude Code state, and Basic Memory state all live under `/app/runtime` or `/app/memory-projects`.
- Basic Memory project directories are created per slug.
- Agents are directly runnable Claude Code primary agents.
- Fuxi 50 node files exist.
- 16 initialization list is correct.
- B09 is present as on-demand file but not initialized.
- TypeScript build passes.
- Static validation passes.
- Container build passes.
- Container status endpoint can create and inspect `/tesla-demo`.

## Current Known Blocker

The chain reaches real Fuxi/Claude Code provider calls. If Ark authentication fails, E2E must stop at:

```text
fuxi_init_failed
```

The host must not switch provider automatically.

## Acceptance

- All local/container checks pass.
- Live provider failure, if any, is exact and visible in event logs.
- No local host process or non-container Basic Memory/Claude Code state is used for the accepted test.
