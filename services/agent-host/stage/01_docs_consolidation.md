# Stage 01 Docs Consolidation

Status: completed

## Deliverables

- `docs/ARCHITECTURE.md`
- `docs/MEMORY_MODEL.md`
- `docs/BODHISATTVA_ENGINE.md`
- `docs/FUXI_ENGINE.md`
- `docs/BASIC_MEMORY_SYSTEM.md`
- `docs/CLAUDE_AGENTS.md`
- `docs/GONGCAO_ROUTING.md`
- `docs/LUOHAN_MEMORY_RULES.md`
- `docs/RAW_TEXT_POLICY.md`
- `docs/FUXI_NODE_SCHEDULE.md`
- `docs/E2E_100_TURN_VALIDATION.md`

## Key Decisions Captured

- One Basic Memory project per person.
- Every Agent owns its own context.
- Gongcao has its own raw fact/task area.
- Raw text is first-class.
- Fuxi initializes 16 nodes only.
- B09 is not initialized.

## Acceptance

- Docs describe how to run and validate the system.
- Docs no longer rely on old PostgreSQL-only assumptions.
