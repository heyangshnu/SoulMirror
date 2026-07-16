# Chart Asset L0

L0 是命盘事实档案，不是解读报告。

## Hard Step

建档必须先完成：

```text
出生资料
→ chart.calculate_asset 同源计算
→ 生成 chart_asset_id
→ 写入 01_命/_chart_assets/
→ 写入 01_命/L0_排盘事实档案.md
→ 伏羲 16 节点引用同一个 chart_asset_id
```

如果 L0 失败，伏羲初始化失败，对话不进入正式使用。

## Files

```text
01_命/_chart_assets/{chart_asset_id}.json
01_命/_chart_assets/{chart_asset_id}.md
01_命/_chart_assets/{chart_asset_id}.context.md
01_命/_chart_assets/latest.json
01_命/L0_排盘事实档案.md
01_命/L0_模型事实上下文.md
```

JSON 是完整事实资产，Markdown 是人和 Agent 可读索引。`*.context.md` 和 `L0_模型事实上下文.md` 是给伏羲节点优先读取的事实上下文，只整理盘面事实，不做解读。

## Calculation Profile

默认排盘事实层：

```text
bazi_engine: lunar-javascript@1.7.7
ziwei_engine: iztro@2.5.8
timezone: user-provided or Asia/Shanghai
birth_place: optional
true_solar_time: not_applied
ziwei_algorithm: default
ziwei_fix_leap: true
bazi_sect: 2
```

开源库只负责事实结构：四柱、干支、节气、十神、五行、大运、紫微十二宫、星曜、四化、大限、流年/运限。

## Doctrine Profile

默认解读层：

```text
bazi: ziping_wangshuai_geju_tiaohou_liutong_v1
ziwei: sanhe_body_sihua_flow_v1
reality_calibration: enabled
```

Doctrine Profile 不参与排盘，只告诉伏羲如何读盘。

## Regeneration Rule

普通对话、伏羲节点重跑、专题补解都不重新排盘。

只有以下变化才生成新 `chart_asset_id`：

- 出生时间变化。
- 出生地/真太阳时策略变化。
- 子时、节气、闰月规则变化。
- 紫微 algorithm/fixLeap/四化配置变化。
- 未来明确做多流派对照。

## Prompt Contract

伏羲每个节点输入必须包含：

```text
chart_asset_id
chart_context
l0_context_file
chart_asset_json
chart_asset_markdown
l0_fact_file
calculation_profile
doctrine_profile
uncertainty
```

节点先读 `chart_context` 和 `l0_context_file`，再读 Markdown 档案；只有上下文不足时才读完整 JSON。节点不得重新调用排盘工具。如果 asset 缺失，节点返回 error。
