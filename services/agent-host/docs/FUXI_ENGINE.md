# Fuxi Engine

伏羲 is the chart analysis engine. It is not the user-facing answerer and not the memory steward.

## Shape

Fuxi has two layers:

```text
fuxi.md Agent
  = thin dispatcher

fuxi-nodes/
  = 50 existing node prompts
```

The Agent does not rewrite chart methodology. It receives a task, reads the existing L0 chart asset, picks a node prompt, gathers inputs, calls the configured model, and writes the report to `01_命/` through the role-scoped memory tool.

## L0 Chart Asset

Fuxi never starts from a loose birth profile.

Before Fuxi runs, Host creates:

```text
01_命/_chart_assets/{chart_asset_id}.json
01_命/_chart_assets/{chart_asset_id}.md
01_命/_chart_assets/latest.json
01_命/L0_排盘事实档案.md
```

The asset contains:

- BaZi facts from `lunar-javascript`.
- Ziwei facts from `iztro`.
- current period index.
- `calculation_profile`.
- `doctrine_profile`.
- uncertainty notes.

All F0 initialization nodes use the same `chart_asset_id`. Nodes do not recalculate BaZi/Ziwei.

## Model

Fuxi uses the configured DeepSeek v4 pro provider. Keys and provider settings are external configuration only.

Do not write model keys into:

- docs.
- Agent files.
- Basic Memory notes.
- logs.
- runtime spool.

## Inputs

Fuxi task may include:

- person id / memory project.
- `chart_asset_id`.
- L0 chart asset path.
- target node code.
- target year/period.
- relation object chart.
- family member charts.
- user raw question.
- relevant reality quotations.

## Outputs

Fuxi writes:

```text
01_命/{node_code}_{node_name}.md
```

Each report note should include:

- Summary.
- Full report body.
- Observations.
- Relations.
- Pending Confirmation.
- Counter-evidence hooks.
- Source chart metadata.

## L0-L3

The chart layer still uses L0-L3:

```text
L0 排盘事实：raw chart facts, calculation profile, doctrine profile, uncertainty. No interpretation.
L1 立势：lifelong mechanisms and main tensions.
L2 入场：life fields and domain manifestations.
L3 观变：period/year/month activation.
```

## 16 Initialization Nodes

New users initialize only:

```text
A01 本命总解
A02 八字气候报告
A03 紫微生命地图
A04 一生命势报告
A05 命盘机制卡报告
B06 全生命周期大运大限报告
B07 当前十年深解
B10 当前流年报告
C13 事业成事报告
C16 财富资源报告
C18 合作团队报告
C19 学习认知报告
C20 表达内容报告
C24 健康精力报告
C25 福德内在报告
D28 亲密关系报告
```

Do not initialize B09.

## B09 Policy

B09 全生命周期流年报告 is not part of initial generation. It is heavy, low immediate reuse, and likely to flood memory.

Use light yearly index at initialization. Generate deeper year content only when:

- user asks a specific year.
- user asks a theme in a year.
- user asks a future range.
- a year becomes operationally important.

## Trigger Levels

```text
F0 初始化
F1 周期更新
F2 明确命理请求
F3 高风险决策
F4 反复主题，现有底座不足
```

## Fuxi Task

```markdown
# FUXI-TASK-{date}-{seq}

报告类型：
触发等级：
触发原因：

## 输入
- 用户命盘：
- 额外对象：
- 目标年份/周期：
- 现实主题原文：

## 期望
基于象、势、场、流、变、应生成长期可引用的命盘参照。

## 输出去向
`01_命/{报告名}.md`
```

## Review

Fuxi outputs are internal references by default. 菩萨 turns them into user language.

Every report should distinguish:

- chart fact.
- chart interpretation.
- reality quote.
- hypothesis.
- confirmed calibration.
- counter-evidence.
