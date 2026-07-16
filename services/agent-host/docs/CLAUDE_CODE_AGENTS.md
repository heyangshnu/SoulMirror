# Claude Code Agents

This project uses native Claude Code CLI as the Agent engine.

```text
agents/{agent}.md
```

The Host builds each prompt from the Agent SOUL Markdown plus the stage prompt, then runs native:

```text
claude -p --output-format stream-json --mcp-config ... --strict-mcp-config
```

The Markdown body is the Agent SOUL: role, boundary, memory method, embedded Skills, and completion standard.

Container runtime currently pins Claude Code `1.0.128`, because the Linux arm64 2.1.x native binary returned no `-p` stream output in the container smoke test. `--bare` can be re-enabled with `CLAUDE_CODE_USE_BARE=1` after a future Claude Code version passes container smoke. Isolation is enforced by the container, per-slug HOME/XDG roots, generated MCP config, `--strict-mcp-config`, and disallowed built-in tools.

## Agents

```text
bodhisattva.md
gongcao.md
luohan-wish.md
luohan-environment.md
luohan-relation.md
luohan-force.md
fuxi.md
```

## Commands

Commands live in:

```text
commands/
```

Required commands:

- `fuxi-run-node.md`
- `fuxi-initialize-16.md`

## Session Policy

- Bodhisattva keeps one long Claude Code session per slug.
- Gongcao keeps one long Claude Code session per slug.
- Each Luohan keeps one long Claude Code session per slug.
- Fuxi is stateless: one Claude Code run per node task.
- Claude Code session state is working context only; Basic Memory Markdown is the truth source.

## Worker Policy

- Bodhisattva worker x1: answer immediately after reading sufficient context.
- Gongcao worker x1: serially drains post-turn packets and receipts.
- Luohan workers x4: each domain drains all pending envelopes in batch.
- Fuxi workers x5: concurrent node initialization and on-demand supplement.

## Model Policy

Do not hardcode provider keys or secrets in Agent files.

Default model split:

- Fuxi: Ark `deepseek-v4-pro`, Anthropic-compatible base URL `https://ark.cn-beijing.volces.com/api/plan`.
- Bodhisattva/Gongcao/Luohan: MiniMax M3, Anthropic-compatible base URL `https://api.minimaxi.com/anthropic`.
- Bodhisattva/Gongcao/Luohan fallback: Ark `ark-code-latest`, implemented by Host-level retry.

Agent files may state the intended class of model, but actual provider/model must remain config-driven.

## Permission Policy

Start conservative:

- Bodhisattva: no file edit for long-term memory.
- Gongcao: write only through `memory.write_gongcao` under `06_功曹/`.
- Luohan: write only through the matching role-scoped `memory.write_luohan_*`.
- Fuxi: write only through `memory.write_fuxi` under `01_命/`.

Claude Code permission configuration may not support path-level enforcement in all deployments, so the Agent SOUL must restate the boundary.

## Completion Standard

Every command/Agent run should end with:

```text
AGENT_TASK_COMPLETE
```

If a tool is unavailable, the Agent must output an executable draft and clearly mark that no write occurred.

## Package Source

The final package is based primarily on:

```text
/Users/c/Downloads/SoulZen_罗汉功曹菩萨_Claude Code_SoulSkill_v2/
```

It absorbs corrections from:

```text
/Users/c/Downloads/soulzen_claude-code_agents_v3_correct/
```

Changes made for this project:

- Add `fuxi.md`.
- Remove hardcoded model names.
- Tighten Bodhisattva write boundary.
- Make Gongcao a light dispatcher with routing memory and receipt loop.
- Add raw-text-first policy.
- Add Fuxi 16-node schedule.
