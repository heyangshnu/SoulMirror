# fate-and-fortune Architecture

本子项目的当前目标是验证一套以人为核心的长期理解系统，而不是一次性算命报告。

```text
一个人的发展路径
= 命盘底座
+ 愿景目标
+ 外部环境
+ 社会关系
+ 可调用力量
+ 当前应对
```

## 核心分工

```text
伏羲：命盘解读与专题报告
功曹：每轮后置判断、原始事实留痕、派发工单
愿罗汉：愿景、目标、执行
境罗汉：城市、行业、家庭、教育、组织等外部环境
缘罗汉：血缘、亲密、朋友、商业、浅层关系
力罗汉：时间、精力、健康、现金、资产、能力、工具、支持、试错额度
菩萨：面向用户回应，每轮自己读取并组织上下文
Basic Memory：一人一 project，Markdown 真源 + 索引 + MCP
```

## Runtime

```text
User
  ↓
L0 Chart Asset Step
  - calculate BaZi facts
  - calculate Ziwei facts
  - write chart_asset_id into 01_命/_chart_assets/
  ↓
Bodhisattva Agent
  - search/read/build_context
  - answer user
  - produce write-back candidates
  ↓
Gongcao Agent
  - keep raw turn facts
  - triage post-turn candidates
  - dispatch Luohan/Fuxi tasks
  ↓
Luohan Agents
  - update domain notes
  - preserve raw quotes
  - merge/confirm/archive
  ↓
Fuxi Agent
  - execute existing node prompts
  - write chart reports
  ↓
Basic Memory Project
```

Host code remains thin. It may transport messages, create the deterministic L0 chart asset, start Claude Code, execute Gongcao route decisions, and record runtime facts. It must not hardcode BaZi/Ziwei interpretation, memory-worthiness judgment, or five-domain classification logic.

## L0 Chart Asset

Fuxi initialization has a hard prerequisite:

```text
birth profile
→ lunar-javascript / iztro factual calculation
→ chart_asset_id
→ 01_命/_chart_assets/{chart_asset_id}.json
→ 01_命/L0_排盘事实档案.md
→ A01~D28 all reference the same chart_asset_id
```

`calculation_profile` and `doctrine_profile` are separate.

- `calculation_profile` records engines, versions, timezone, true-solar-time status, Ziwei algorithm/fixLeap, and uncertainty.
- `doctrine_profile` records the default Fuxi reading stack: BaZi 子平/月令旺衰/格局/调候/流通/十神转译; Ziwei 三合为体/四化为用/大限流年为时间主场.

If L0 fails, Fuxi initialization fails. Individual Fuxi nodes must not recalculate the chart.

## Basic Memory Project Layout

Each person owns one Basic Memory project:

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

Cross-person access is explicit and scoped. Partner, family, and collaboration analysis can link projects only when the user authorizes the relationship context.

## Five Domains

### 命

命是伏羲维护的命盘底座。它 contains:

- BaZi and Ziwei chart assets.
- Fuxi 16 initialization reports.
- Later topic reports.
- Period/year reports.
- Calibration questions and counter-evidence.

命 is a structural reference, not a reality log. It should not absorb user events directly.

### 愿

愿 records what the user wants to become, preserve, escape, build, or execute.

Layers:

- L0 愿景：理想人生、理想生活、终极目标。
- L1 大目标：1-5 年阶段方向。
- L2 短期目标：1-6 个月方向。
- L3 当前执行：today/this week/current blockers.

### 境

境 records external fields:

- city, home, industry, education, work, social, technology, policy, organization.
- time x field structure.
- support/constraint created by environment.

### 缘

缘 records relationships:

- blood relation.
- intimate relation.
- core friends.
- business relation.
- shallow relation.

It keeps people, relationship state, pressure/support flows, boundary issues, and repeated patterns.

### 力

力 records callable capacity:

- time, energy, health.
- cash, asset, runway.
- ability, tool system, network.
- family support and trial capacity.

力 is not only resource count; it is the user's real carrying capacity.

## Agent Autonomy

Every Agent owns its own context. There is no single global Context Pack Agent.

- 菩萨 builds its answer context.
- 功曹 builds post-turn triage context.
- 罗汉 build domain-maintenance context.
- 伏羲 builds chart-node execution context.

This keeps responsibility local while Basic Memory remains the shared memory substrate.

## Non-Goals

- Do not initialize B09 full-life yearly report.
- Do not use a graph database in v0.
- Do not make every memory a separate file.
- Do not let 菩萨 write long-term memory.
- Do not let 功曹 modify domain notes.
- Do not overwrite user language with Agent summaries.

## Reference Inputs

The current design consolidates:

- `/Users/c/Downloads/SoulZen_罗汉功曹菩萨_Claude Code_SoulSkill_v2/`
- `/Users/c/Downloads/soulzen_claude-code_agents_v3_correct/`
- `/Users/c/Downloads/伏羲解盘提示词体系_节点独立版_v2/`
- `/Users/c/SoulMirror/docs/gpt讨论.txt`
- `~/soulzen`
