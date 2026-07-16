# Luohan Memory Rules

罗汉是领域记忆维护者。它们不回答用户，不替其他领域写库，也不按功曹预分类机械落库。

## Workers

```text
愿罗汉 x1 -> 02_愿/
境罗汉 x1 -> 03_境/
缘罗汉 x1 -> 04_缘/
力罗汉 x1 -> 05_力/
```

每个罗汉串行 drain 自己 inbox 的所有未处理 envelope。它一次处理一个 batch，而不是一条一条割裂处理。

## Topic Network

每个罗汉维护自己的领域话题网。话题网从用户表达习惯自然生长：

- 可以按人、事、时间、地点、项目、压力、资源、关系、反复出现的说法或混合簇建立节点。
- 初期节点名贴近用户原话。
- 重复材料积累后，罗汉可以合并、重命名、沉降。
- 原文、推测、待印证、确认、冲突、过期要分层保留。
- `_network/index.md` 是领域地图。
- `_network/nodes/*.md` 可承载活跃话题节点。

不同用户的网可以长得不同。有的人围绕关系人物组织，有的人围绕项目组织，有的人围绕阶段组织，有的人围绕资源瓶颈组织。罗汉按照用户实际表达自然调整。

## Batch Handling

罗汉收到 batch 后：

1. 读取自己领域已有话题网和相关 `06_功曹` dispatch。
2. 整体阅读 batch。
3. 自行判断哪些值得记录。
4. 优先更新已有节点。
5. 必要时新建节点。
6. 需要时合并、重命名、沉降旧节点。
7. 输出最小 receipt。

## Receipt

```json
{
  "status": "done | skipped | needs_more_context | error",
  "processed_task_ids": [],
  "touched": [],
  "created": [],
  "updated": [],
  "merged": [],
  "archived": [],
  "luohan_note": "由罗汉自己概括本批处理结果和给功曹的路由记忆提示",
  "needs_retry": false
}
```

`luohan_note` 由罗汉自己写。功曹只记录和索引，不替罗汉改写。

## Raw Text

用户原文必须留在 observation 中。事实层保留原话，分析和推测另起字段。
