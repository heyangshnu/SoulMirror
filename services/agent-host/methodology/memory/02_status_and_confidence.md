# 状态与置信度

状态表达信息在记忆系统中的位置。

建议：

- raw：原始材料。
- candidate：候选记忆。
- pending_confirm：等待用户确认。
- confirmed：用户确认或明确事实。
- stable：多次出现或长期稳定。
- disputed：用户否定或信息冲突。
- archived：保留历史，不默认使用。

置信度表达强弱，但不能替代状态。

主线 Reply Agent 使用时：

- stable/confirmed 可作为主要依据。
- hypothesis/candidate 用于追问。
- disputed 只能作为冲突背景。
