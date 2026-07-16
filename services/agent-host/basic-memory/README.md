# Basic Memory Layout

This folder stores templates and conventions for the Basic Memory project used by fate-and-fortune.

Runtime projects are one-person-one-project. This folder is not a user project; it is the implementation template source.

## User Project Layout

```text
00_soul/
01_命/
01_命/_chart_assets/
02_愿/
03_境/
04_缘/
05_力/
06_功曹/
07_上下文包/
08_归档/
```

## Templates

```text
templates/basic-memory-note-template.md
templates/context-pack-template.md
templates/fuxi-task-template.md
templates/gongcao-task-template.md
templates/luohan-memory-card-template.md
```

## Rules

- Do not create one note per turn.
- Do not put all users in one project.
- Preserve raw user wording.
- Use approved observation categories.
- Let Luohan topic networks grow from the user's expression habits.
- Let Gongcao write communication audit, dispatch, receipts, and routing memory only in `06_功曹/`.
- Let Luohan own domain topic networks.
- Let Fuxi own `01_命/`.
- Let Bodhisattva read and produce write-back candidates.

## Role-Scoped Memory MCP

Claude Code Agents use the project-local role-scoped wrapper, not the generic Basic Memory writer:

```json
{
  "mcp": {
    "fate_memory": {
      "type": "local",
      "command": ["npm", "run", "mcp:memory"],
      "cwd": "{env:FATE_AND_FORTUNE_ROOT}",
      "environment": {
        "BASIC_MEMORY_CONFIG_DIR": "{env:BASIC_MEMORY_CONFIG_DIR}",
        "BASIC_MEMORY_HOME": "{env:BASIC_MEMORY_HOME}",
        "FASTEMBED_CACHE_PATH": "{env:FASTEMBED_CACHE_PATH}"
      }
    }
  }
}
```

The wrapper exposes read tools plus role-scoped writes:

```text
memory.write_gongcao -> 06_功曹/
memory.write_fuxi -> 01_命/
memory.write_luohan_wish -> 02_愿/
memory.write_luohan_environment -> 03_境/
memory.write_luohan_relation -> 04_缘/
memory.write_luohan_force -> 05_力/
```

The container pins:

```text
basic-memory==0.22.0
```

The host sets these paths per slug:

```text
BASIC_MEMORY_CONFIG_DIR=/app/runtime/basic-memory/{slug}/config
BASIC_MEMORY_HOME=/app/memory-projects/{slug}
FASTEMBED_CACHE_PATH=/app/runtime/basic-memory/fastembed-cache
```

Local development mirrors the same shape under `runtime_spool/`.

If the installed Basic Memory command differs, update the Host-generated MCP config in `host/src/claude-code-runner.ts`; do not change Agent responsibility boundaries.
