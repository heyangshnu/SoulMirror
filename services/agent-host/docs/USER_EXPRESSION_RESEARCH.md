# User Expression Research

Purpose: before live testing, user messages must sound like real users, not internal architecture probes.

## Sources Checked

- Local product discussion: `/Users/c/SoulMirror/docs/gpt讨论.txt`
- Local pasted research notes under `/Users/c/.codex/attachments/`
- Public search sampling:
  - Zhihu career questions such as "每天上班都想辞职怎么办", "工作压力大，想辞职，不知道该不该辞职", and "工作很累，想辞职，想要一个建议".
  - Douban relationship / breakup posts where users write from emotional stuckness rather than clean decision trees.
  - Xiaohongshu-related reporting on "放假完不想上班怎么办" and everyday "问一问" style questions.
  - public命理咨询 product pages and posts around career, relationship, wealth, yearly luck, and practical life advice.

The public-search goal is not to copy user posts. It is to capture expression patterns: how people naturally ask for help when they are confused, stressed, or facing career/relationship/resource decisions.

## Expression Patterns

Real user messages are usually not architectural.

They tend to start from:

- a current pain: "最近睡不好", "有点撑不住", "越来越烦"
- an uncertain decision: "要不要", "该不该", "还能不能", "是不是"
- mixed context: career + money + relationship + health in one paragraph
- incomplete facts: users do not cleanly separate goals, resources, environment, and relationships
- self-doubt: "我是不是想太多", "我是不是不适合", "是不是我太执着"
- ordinary wording: "怎么办", "你帮我看看", "我想问一下", "我有点迷茫"
- concrete-but-not-structured background: "工资不高但是工作很多很累", "舍不得分开但在一起更痛苦", "机会多但每天被消耗"
- practical expectation: users often want an answer that sounds like a capable friend or consultant, with next steps, not a taxonomy.

They usually do not say:

- "请分析我的愿境缘力"
- "当前阶段第 3 层怎么安排"
- "请按五轴输出"
- "请触发伏羲/罗汉"

## Test Language Rules

Live test user turns must:

- use first-person ordinary language.
- include hesitation and partial context.
- ask one natural question per turn, even if the background is messy.
- preserve stage-specific biography details only as lived experience, not as Wikipedia summary.
- avoid internal words: 菩萨, 功曹, 罗汉, 伏羲, 命/愿/境/缘/力, L0-L3, Agent, MCP, Basic Memory.
- avoid explicit test framing: "第 N 轮", "测试", "stage", "workflow".

## Tesla Fixture Policy

The Tesla live fixture uses Tesla's biography as background, but the surface expression must sound like a person asking for help:

Bad:

```text
第 12 轮。请分析当前阶段第 2 层的愿境缘力。
```

Good:

```text
我跟投资人聊完经常很累，他们问的问题都很实际，但我心里会有一种被缩小的感觉。
```

The current fixture is:

```text
tests/fixtures/tesla-realistic-user-turns.zh.mjs
```

It contains exactly 100 user turns and is checked by static validation.
