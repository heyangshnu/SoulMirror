# E2E 100-Turn Validation

After docs, agents, Basic Memory layout, Fuxi dispatch, container runtime, and `/{slug}` page are implemented, run a 100-turn biography test through the real WebSocket/Claude Code/Basic Memory chain.

## Purpose

The test is not a demo transcript. It is a workflow audit.

It checks:

- Does Bodhisattva retrieve the right memory?
- Does Gongcao preserve raw wording and dispatch only when needed?
- Do Luohan agents update existing notes instead of creating junk files?
- Does Fuxi trigger only when needed?
- Does B09 remain uninitialized?
- Does the project remain readable after 100 turns?

## Biography Choice

Use a person with:

- sufficient biography material.
- reasonably reliable birth data.
- rich career, relationship, environment, resource changes.
- enough public timeline to simulate stage-specific questions.

Candidate must be documented in the validation report before the run.

## Run Shape

```text
1. Open /{slug}, for example /tesla-demo.
2. Create one Basic Memory project.
3. Enter gender and birth datetime.
4. Run F0 16-node Fuxi initialization through Fuxi/Claude Code.
5. Continue 100 turns from one chosen life stage through the page or live harness.
6. For each turn record:
   - user message
   - Bodhisattva call
   - Gongcao route JSON
   - dispatched Luohan/Fuxi calls
   - Claude Code/MCP tool-call events
   - notes touched
   - problems found
7. Fix Agent/workflow/note rules when issues appear.
8. Re-run affected segments.
9. Produce final validation report.
```

## Required Log Fields

```json
{
  "turn": 1,
  "user_message": "...",
  "domains": ["愿", "境"],
  "bodhisattva_context": ["..."],
  "gongcao_action": "DISPATCH_LUOHAN",
  "luohan_tasks": ["..."],
  "fuxi_task": null,
  "notes_touched": ["..."],
  "raw_text_preserved": true,
  "b09_initialized": false,
  "issues": []
}
```

## Acceptance Criteria

- 100 turns complete.
- B09 is not initialized.
- Gongcao records raw text in every handled turn.
- Most turns are `NO_ACTION` or `LOG_ONLY`; heavy dispatch is justified.
- Each domain has stable notes rather than many per-turn notes.
- At least these scenes are covered:
  - city/migration.
  - partner relationship.
  - career/project.
  - cash/resource carrying capacity.
  - family/parent/child pressure.
  - specific year or period question.
  - high-risk decision.
  - user confirms a hypothesis.
  - user denies a hypothesis.
- Final report lists every fix made during iteration.
- User turns sound like real user messages, not internal architecture prompts.

## Report Location

```text
stage/08_100_turn_biography_test.md
runtime_spool/runs/{slug}/{runId}/
tests/output/live-tesla-100-*.jsonl
```

## Current Live Harness

`npm run test:live:tesla100` connects to:

```text
FATE_TEST_URL or http://127.0.0.1:8787
WS /ws?slug=tesla-demo
```

It sends Tesla birth data and then 100 Tesla-perspective user turns from:

```text
tests/fixtures/tesla-realistic-user-turns.zh.mjs
```

The fixture avoids internal system terms such as "五轴", "愿境缘力", "第 N 轮", "Agent", "MCP", and "Basic Memory". It does not mock Agent output or Basic Memory writes. If Claude Code, provider keys, model env, or Basic Memory MCP are unavailable, it fails and records the failure event.

The fixture is intentionally written as first-person, messy, stage-specific user speech:

- short questions mixed with anxiety, hesitation, and practical pressure.
- repeated themes rather than perfectly categorized requirements.
- no internal labels, no architecture vocabulary, no forced test markers.
- questions that can naturally trigger Gongcao, Luohan, or Fuxi only when the running Agents judge it necessary.

Before a real 100-turn run, first review `docs/USER_EXPRESSION_RESEARCH.md` and the fixture file. If the turns start sounding like prompts written for the system instead of a real person asking for help, update the fixture before testing.

## Current Known Failure Mode

If Fuxi provider authentication fails, the expected live result is:

```text
fuxi_init_failed
```

The system must stop there. It must not continue into Bodhisattva conversation, because the agreed foundation is "八字和紫微底盘 + 五维长期记忆".
