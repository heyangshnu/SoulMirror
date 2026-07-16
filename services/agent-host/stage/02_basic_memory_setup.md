# Stage 02 Basic Memory Setup

Status: completed-configured

## Deliverables

- `basic-memory/README.md`
- `basic-memory/templates/*`
- Project layout docs.
- Role-scoped `fate_memory` MCP config in root `host/src/claude-code-runner.ts`.
- Portable sample in `host/src/claude-code-runner.ts`.

## Required Project Layout

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

## Tool Requirements

Claude Code must receive:

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

Generic Basic Memory write tools are not exposed to Agents.

## Open Item

`basic-memory` remains container-pinned as project/status support. Runtime verification should happen inside the container. The Dockerfile pins `basic-memory==0.22.0`.
