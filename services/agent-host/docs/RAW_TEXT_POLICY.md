# Raw Text Policy

The system must preserve the user's original language.

This is a first-class requirement because repeated summarization drifts away from the user's actual meaning.

## Rule

```text
事实层记录原文。
分析层另起字段。
推测层必须标注。
不能用 Agent 总结替代用户原话。
```

## Required Observation Shape

```markdown
- [explicit]
  原文：「...」
  说话者：user | assistant | system | fuxi | gongcao | luohan
  时间：YYYY-MM-DD HH:mm
  来源：turn_id / note / report / task
  轻注：...
  禁止误用：...
```

## Inference Shape

```markdown
- [inferred]
  推测：...
  依据原文：
    - 「...」
  置信度：low | medium | high
  待印证：是 | 否
```

## Confirmation Shape

```markdown
- [confirmed]
  用户确认原文：「...」
  被确认假设：...
  时间：YYYY-MM-DD HH:mm
```

## Dispute Shape

```markdown
- [conflict]
  用户否定原文：「...」
  被否定判断：...
  处理：downgrade | archive | mark_conflicted
```

## Agent Requirements

菩萨:

- may quote short user phrases in write-back candidates.
- must not create long-term note.

功曹:

- must keep raw turn facts in `06_功曹/`.
- should include exact user wording in tasks.

罗汉:

- must include original wording when adding observations.
- may add light notes but not replace the original.

伏羲:

- may interpret chart reports, but when it uses reality material, it must quote the supplied real-life text separately from chart inference.
