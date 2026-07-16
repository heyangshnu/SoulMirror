---
description: 指定罗汉处理功曹派发的记忆工单。
agent: luohan-wish
---

请根据当前工单选择相应罗汉执行。若当前 agent 与工单目标不一致，请说明应转交给哪个罗汉。

执行步骤：

1. 读取工单。
2. 搜索 Basic Memory 中是否已有相关 note。
3. 判断新建、更新、合并、待印证、丢弃或归档。
4. 写入或生成写入草案。
5. 更新 Observations、Relations、Summary、Pending Confirmation。
6. 完成后输出 AGENT_TASK_COMPLETE。
