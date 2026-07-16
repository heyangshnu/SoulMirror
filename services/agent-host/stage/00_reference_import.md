# Stage 00 Reference Import

Status: completed

## Inputs

- `/Users/c/Downloads/SoulZen_罗汉功曹菩萨_Claude Code_SoulSkill_v2/`
- `/Users/c/Downloads/soulzen_claude-code_agents_v3_correct/`
- `/Users/c/Downloads/伏羲解盘提示词体系_节点独立版_v2/`
- `/Users/c/SoulMirror/docs/gpt讨论.txt`
- `~/soulzen`

## Decisions

- Use v2 as the main Agent/SOUL source.
- Absorb v3_correct directory and command corrections.
- Import all 50 Fuxi node prompts into `fuxi-nodes/`.
- Add our own `fuxi.md` thin dispatcher.
- Keep Basic Memory as the v0 memory substrate.

## Imported Paths

```text
agents/
commands/
basic-memory/templates/
fuxi-nodes/
```

## Acceptance

- Reference files live inside the subproject.
- The system no longer depends on Downloads paths at runtime.
