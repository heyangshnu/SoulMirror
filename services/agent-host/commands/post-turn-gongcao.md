---
description: 每轮对话后调用功曹，判断是否沉淀、派发罗汉或触发伏羲。
agent: gongcao
---

请作为功曹 Agent 处理本轮对话后的回写判断。

输入：

$ARGUMENTS

要求：

1. 优先保留用户原文和菩萨回写候选原文。
2. 只写或建议写 `06_功曹/`。
3. 不直接修改愿/境/缘/力长期 note。
4. 输出 NO_ACTION / LOG_ONLY / DISPATCH_LUOHAN / TRIGGER_FUXI / ASK_CLARIFICATION_LATER / MIXED。
5. 若派发工单，按 `basic-memory/templates/gongcao-task-template.md`。
6. 完成后输出 `AGENT_TASK_COMPLETE`。
