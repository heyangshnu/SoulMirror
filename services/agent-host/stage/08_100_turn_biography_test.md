# Stage 08 100-Turn Biography Test

Status: active-live

## Candidate

Use Nikola Tesla unless a better biography target is selected before the run.

Reason:

- public biography is rich.
- career / environment / resource themes are strong.
- relationship, isolation, reputation, money, invention, and era pressure are all testable.

Risk:

- exact birth time reliability must be treated as estimated.

## Required Run

```text
1. Open /tesla-demo.
2. Create Basic Memory project in the container volume.
3. Initialize 16 Fuxi nodes through real Fuxi/Claude Code calls.
4. Continue 100 turns from Tesla perspective through the real WebSocket chain.
5. Use realistic first-person user language, not internal architecture prompts.
6. Log every Agent event, MCP/tool call, Gongcao route, Luohan result, Fuxi result, and memory diff.
7. Fix workflow issues immediately.
8. Re-run affected segments.
9. Produce final validation report.
```

## User-Language Requirement

The 100 user turns come from:

```text
tests/fixtures/tesla-realistic-user-turns.zh.mjs
```

The fixture must contain normal user expression:

- "我最近..."
- "我是不是..."
- "该不该..."
- "你帮我看看..."
- mixed practical/emotional context.

It must not contain:

- "第 N 轮".
- "五轴".
- "愿境缘力".
- "Agent".
- "MCP".
- "Basic Memory".
- "L0/L1/L2/L3".

## Acceptance

- 100 turns complete through real Claude Code + Basic Memory.
- B09 not initialized.
- Raw text preserved.
- Gongcao not over-dispatching.
- Luohan notes remain stable.
- Fuxi triggers justified.
- Event page and run files can replay what happened.

## Current Result

Live harness exists:

```text
FATE_TEST_URL=http://127.0.0.1:8788 npm run test:live:tesla100
```

Current expected failure, if Ark credentials are invalid:

```text
fuxi_init_failed
```

That failure is acceptable only as a provider/config blocker. It is not a substitute for the 100-turn test.
