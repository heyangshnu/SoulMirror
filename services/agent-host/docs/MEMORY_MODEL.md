# Memory Model

第一版长期记忆采用 Basic Memory，而不是自研 DuckDB/SQLite Memory MCP。

```text
Basic Memory project
= Markdown note true source
+ local index
+ observations
+ relations
+ MCP read/write/search/build_context tools
```

## Project Per Person

每个用户一个 Basic Memory project。多用户、伴侣、家庭场景通过显式授权建立联通关系，不把所有人混入同一 project。

## Note Granularity

不要一条记忆一个文件。使用主题 note / 实体 note / 报告 note。

Good:

```text
02_愿/回上海阶段目标.md
03_境/当前城市环境.md
04_缘/亲密关系_伴侣.md
05_力/现金流承载.md
01_命/A05_命盘机制卡报告.md
```

Bad:

```text
2026-06-13-001.md
memory_0001.md
turn_19_relation.md
```

## Standard Note Shape

```markdown
---
title: 标题
type: wish_goal | environment | relation | force | fuxi_report | gongcao_task | context_pack
domain: 命 | 愿 | 境 | 缘 | 力 | 功曹
layer: L0 | L1 | L2 | L3 | pattern | report | custom
status: active | pending_confirmation | phase_active | durable | outdated | conflicted | archived
confidence: low | medium | high
stability: current | phase | durable | historical
salience: low | medium | high | critical
tags:
  - "#标签"
---

# 标题

## Summary

## Observations

## Relations

## Pending Confirmation

## Update Log
```

## Raw Text Policy

All facts must preserve original wording whenever possible.

```markdown
- [explicit]
  原文：「我越来越想回上海，不管有钱没钱都想回去。」
  说话者：user
  时间：YYYY-MM-DD
  轻注：阶段目标增强，涉及城市迁移与小家边界。
  禁止误用：不得直接写成“用户已决定搬家”。

- [inferred]
  推测：回上海可能不只是城市选择，也涉及社交、自我空间和家庭边界。
  置信度：medium
  待印证：是
```

The explicit layer stores what was said. The inferred layer stores Agent interpretation. They must not be merged.

## Observation Categories

Use only:

- explicit
- fact
- inferred
- confirmed
- pending_confirmation
- constraint
- support
- pressure
- pattern
- change
- conflict

## Relation Types

Use only:

- supports
- constrains
- depends_on
- triggers
- relates_to
- updates
- evidences

Relations exist to expand retrieval context, not to make the LLM read a large graph.

## Gongcao Store

`06_功曹/` is a first-class memory area:

```text
原始轮次记录.md
回写候选.md
派发工单.md
伏羲触发记录.md
Agent完成回执.md
```

Gongcao should preserve raw turn facts and create tasks. It must not rewrite domain notes.

## Domain Write Ownership

- 菩萨: read only for long-term memory; writes no domain note.
- 功曹: writes only `06_功曹/`.
- 愿罗汉: writes only `02_愿/`.
- 境罗汉: writes only `03_境/`.
- 缘罗汉: writes only `04_缘/`.
- 力罗汉: writes only `05_力/`.
- 伏羲: writes only `01_命/`.

## Update Priority

罗汉写入优先级:

```text
更新旧 note
> 追加 observation
> 合并重复
> 标记待印证
> 新建 note
```

New notes require a genuinely new theme, person, goal, environment, resource, or Fuxi report.

## Context Use

Agents should not ask Basic Memory for everything. They should:

1. search notes by problem.
2. read 3-8 relevant notes.
3. build context around one or two core notes, depth 1-2.
4. compress into the agent's own working context.
5. answer or write within its boundary.
