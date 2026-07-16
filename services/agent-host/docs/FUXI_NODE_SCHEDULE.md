# Fuxi Node Schedule

All Fuxi node prompts are stored under:

```text
fuxi-nodes/
```

They are imported from:

```text
/Users/c/Downloads/伏羲解盘提示词体系_节点独立版_v2/
```

## Initialization Schedule

Run these 16 nodes in parallel after chart assets are ready:

| Code | Node | File |
|---|---|---|
| A01 | 本命总解 | `fuxi-nodes/A_单人基础报告/01_本命总解_prompt.md` |
| A02 | 八字气候报告 | `fuxi-nodes/A_单人基础报告/02_八字气候报告_prompt.md` |
| A03 | 紫微生命地图 | `fuxi-nodes/A_单人基础报告/03_紫微生命地图_prompt.md` |
| A04 | 一生命势报告 | `fuxi-nodes/A_单人基础报告/04_一生命势报告_prompt.md` |
| A05 | 命盘机制卡报告 | `fuxi-nodes/A_单人基础报告/05_命盘机制卡报告_prompt.md` |
| B06 | 全生命周期大运大限报告 | `fuxi-nodes/B_时间报告/06_全生命周期大运大限报告_prompt.md` |
| B07 | 当前十年深解 | `fuxi-nodes/B_时间报告/07_当前十年深解_{当前年龄或指定大限}.md` |
| B10 | 当前流年报告 | `fuxi-nodes/B_时间报告/10_当前流年报告_{目标年份}.md` |
| C13 | 事业成事报告 | `fuxi-nodes/C_人生方面报告/13_事业成事报告_prompt.md` |
| C16 | 财富资源报告 | `fuxi-nodes/C_人生方面报告/16_财富资源报告_prompt.md` |
| C18 | 合作团队报告 | `fuxi-nodes/C_人生方面报告/18_合作团队报告_prompt.md` |
| C19 | 学习认知报告 | `fuxi-nodes/C_人生方面报告/19_学习认知报告_prompt.md` |
| C20 | 表达内容报告 | `fuxi-nodes/C_人生方面报告/20_表达内容报告_prompt.md` |
| C24 | 健康精力报告 | `fuxi-nodes/C_人生方面报告/24_健康精力报告_prompt.md` |
| C25 | 福德内在报告 | `fuxi-nodes/C_人生方面报告/25_福德内在报告_prompt.md` |
| D28 | 亲密关系报告 | `fuxi-nodes/D_关系报告/28_亲密关系报告_prompt.md` |

## Do Not Initialize

Do not initialize:

```text
B09 全生命周期流年报告
```

## On-Demand Examples

| User question | Trigger |
|---|---|
| 2027 年适合买房吗 | B10/B47 + 力/境罗汉 |
| 我是否适合创业 | C14 |
| 我和伴侣怎么合盘 | D32/D33/D34 after authorized partner chart |
| 最近关系冲突如何理解 | D30/D31 or F45 |
| 孩子教育怎么安排 | E36/E42 after child chart |
| 某个选择怎么取舍 | F46 |
| 现在这个困惑落在哪里 | F44 |

## Node Result Naming

Fuxi writes initialized reports as:

```text
01_命/A01_本命总解.md
01_命/A02_八字气候报告.md
...
01_命/D28_亲密关系报告.md
```

On-demand reports use:

```text
01_命/专题_{node_code}_{topic}_{date}.md
```
