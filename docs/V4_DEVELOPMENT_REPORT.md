# SoulMirror v4 对齐开发报告

> 版本：1.0  
> 日期：2026-05-28  
> 状态：待评审  
> 参考材料：`命理分析APP_外发演示材料包_v4` + 产品方对话（黎晨）

---

## 1. 执行摘要

SoulMirror 将从「多测试 + 治愈短文 + 社交匹配」重构为 **命理基本盘引擎 + 生活方案输出 + 可追问对话系统**。

核心原则（产品方确认）：

1. **命盘是基本盘，不对用户展示**：八字、紫微、宫位、星曜、四柱等仅作后台计算，类似股市的「大环境 / 行业基本面」。
2. **用户看到的是短期影响与生活方案**：大限流年、现实处境转译为「这几年 / 今年在发生什么」「该怎么做」，类似「题材、概念、顺不顺」。
3. **输出是方案，不是解盘**：报告前台不出现命理术语，不出现溯源标签 `[ZW-M]` 等。
4. **内容体系：题库 → 知识点 → 大纲**：v4 内容库作题库；规则标签作知识点；交互/追问树作大纲；AI 负责抽象与合成。
5. **内容库可渐进**：先用 v4 文件摘骨架库；不足时少写、写保守；根据用户对话持续沉淀。

**MVP 目标（8~10 周）**：单人「底色 + 阶段 + 方案」报告、近几年简版、结构化现实补充、三层追问对话、内容库飞轮 v0。

---

## 2. 产品定位

### 2.1 一句话

基于八字与紫微斗数的 **人生基本盘引擎**，结合现实处境与阶段变化，为用户和身边人输出 **可执行生活方案**，并支持持续追问与动态校准。

### 2.2 用户价值（对外叙事）

| 传统产品 | SoulMirror v4 |
|----------|---------------|
| 你今年财运波动，婚姻要注意 | 你这几年外部机会在放大，家庭节奏也在变重——不是谁对谁错，而是两件事同时在发生。先稳定节奏，再放大试错。 |
| 展示命盘术语 | 展示生活语言方案 |
| 一次性静态报告 | 可追问、可校准的对话系统 |

### 2.3 功能边界

**做**：

- 单人底色判断（生活语言）
- 近几年 / 今年阶段主题
- 伴侣 / 孩子 / 家庭关系方案（库充足后逐步加深）
- 现实信息校准
- 追问与话术建议
- 报告导出

**不做**（v4 `18` + 产品方要求）：

- 向用户展示命盘与术语
- 寿命、疾病、必离婚、投资借贷类断言
- 儿童终身标签与学业成败定论
- 磁场匹配社交（下线）

### 2.4 模块处置

| 现有模块 | 决策 |
|----------|------|
| `@soulmirror/chart` 紫微排盘 | 保留，扩展为双盘入口 |
| `packages/bazi`（新建） | 新建，替换 `simple_pillars` |
| 本命 / 大限 / 流年报告 | 重写管道，改方案输出 |
| 关系人 CRUD | 保留 |
| `life_context` | 结构化升级 |
| 心镜 Bot | 重写为「方案追问」模式 |
| MBTI / 塔罗 / 手相 | 下线主路径，代码归档 |
| `social` 磁场匹配 | 下线 |
| 中英文 i18n | 保留 |

---

## 3. 双视图架构（关键设计）

v4 材料中的「溯源卡片」面向 **团队/质检/评审**；用户 APP 只展示 **生活方案层**。

```
┌─────────────────────────────────────────────────────────────┐
│                     用户可见层（前台）                        │
│  底色画像 │ 阶段判断 │ 生活方案 │ 追问入口 │ 安全边界文案      │
│  ✗ 无术语  ✗ 无星曜  ✗ 无宫位  ✗ 无置信度数字暴露            │
└───────────────────────────┬─────────────────────────────────┘
                            │ terminology_strip（术语剥离）
┌───────────────────────────▼─────────────────────────────────┐
│                     内部证据层（后台）                        │
│  命盘 JSON → 标签(BZ/ZW-M/D/Y) → REAL/CHAT → 证据融合        │
│  → analysis_card（推导链、置信度、来源）→ 质检 / 回归测试       │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 股市类比映射

| 股市 | SoulMirror | 用户可见 |
|------|------------|----------|
| 大环境 / 行业基本面 | 八字气质 + 紫微本命结构 | 否 |
| 财报 / 护城河 | 日主、命宫主星组合 | 否 |
| 题材 / 概念 / 游资 | 大限流年 + 现实补充 | 是（生活语言） |
| 涨不涨 / 顺不顺 | 近几年 / 今年节奏 | 是 |
| 操作建议 | 方案卡片（行动、话术、节奏） | 是（核心） |

---

## 4. 内容体系：题库 → 知识点 → 大纲

### 4.1 三层定义

| 层级 | 含义 | v4 对应 | 工程落点 |
|------|------|---------|----------|
| **题库** | 案例、话术、场景素材 | `内容库/01~12`、`Demo_80节`、`交互剧本` | `services/ai/content/` |
| **知识点** | 抽象规则与判断逻辑 | `03~07` 引擎规格、`06` 互证、`07` 校准 | `packages/evidence/` |
| **大纲** | 世界观与输出框架 | `01` 愿景、`14~16` 交互、`15` 追问树 | 报告模板 + followup 路由 |

### 4.2 内容库分期建设

#### Phase 0：骨架库（MVP 启动，约 300 条）

从 v4 文件摘取高频条目，手工 JSON 化：

| 分类 | 条数 | 优先来源文件 |
|------|------|-------------|
| 五行/日主 → 生活气质 | 40 | `内容库/11_八字字段到产品内容` |
| 主星/宫位 → 人格课题 | 60 | `内容库/01`、`02`、`12` |
| 大限宫位 → 十年主题 | 12 | `05`、`内容库/07`（每宫 1 条核心） |
| 流年 → 年度触发 | 12 | `内容库/07`（模板句） |
| 关系冲突模式 | 30 | `内容库/09`、`11_两人合盘` |
| 儿童环境边界 | 20 | `10_案例C`、`18_边界伦理` |
| 内容原子（金句） | 50 | `内容库/05` |
| 场景推导流程 | 30 | `内容库/06`（高频场景） |
| 互证合成句 | 20 | `内容库/08` |
| 报告段落模板 | 26 | `内容库/10`（精选） |

目录结构：

```
services/ai/content/
  manifest.json           # 版本、条目统计、标签索引
  bazi/                   # 八字气质
  ziwei/                  # 星曜宫位
  horoscope/              # 大限流年
  relation/               # 关系冲突与话术
  child/                  # 儿童边界
  atoms/                  # 金句原子
  scenarios/              # 场景→推导流程
  templates/              # 输出段落模板
```

条目 JSON 契约：

```json
{
  "id": "zw_ming_wuqu_qisha_01",
  "tags": ["ZW-M", "命宫", "武曲", "七杀"],
  "match": { "palace": "命宫", "stars": ["武曲", "七杀"] },
  "productHint": "结构推动型，擅长抽象与执行",
  "userFacing": "你擅长把复杂问题变成可执行的步骤，但容易让人觉得被评判。",
  "actions": ["讨论前先问感受，再给建议", "疲惫时不做深度讨论"],
  "topic": ["self_profile", "marriage"],
  "confidenceWeight": 0.8,
  "source": "v4/内容库/12",
  "locale": "zh"
}
```

#### Phase 1：扩展库（~2000 条，关系场景加深）

- 批量解析 `内容库/07`（大限流年）、`09`（关系话术）、`06`（场景推导）
- 引入向量检索（可选 Pinecone / 本地 embedding）按 `topic + tag_ids` 召回

#### Phase 2：对话飞轮（持续）

用户追问 → 高质量回复 → 人工或规则审核 → 沉淀为新条目：

```
services/ai/content/pending/     # 待审核
services/ai/content/approved/    # 已入库
```

飞轮触发条件（满足其一可进入待审核池）：

- 用户对某条方案点击「有帮助」
- 同一类追问 7 天内出现 ≥ 5 次
- 运营人工标记

### 4.3 库不足时的保守策略

管道内置 **coverage** 评估：

| 库命中数 | 内部 confidence | 用户层行为 |
|----------|----------------|-----------|
| ≥ 3 条 | 正常（0.7~0.9） | 完整三联报告 |
| 1~2 条 | 偏低（0.5~0.69） | 缩短方案，少给具体话术，多加「需更多了解」 |
| 0 条 | 低（< 0.5） | 只输出底色 + 通用节奏建议，不硬写关系细节 |

**原则**：宁可少说，不可乱说。高难度 topic（合盘深度、家庭系统）在库覆盖不足时 **降级或暂不上线**。

---

## 5. 技术架构

### 5.1 总体架构

```
Mobile (Expo)
    ↓
API (NestJS)
    ├── ChartModule      排盘、建档、关系人
    ├── AnalysisModule   方案报告（新）
    ├── LifeContextModule 现实补充（升级）
    ├── FollowUpModule   追问路由（新）
    └── BotModule        方案对话（改造）
    ↓
packages/
    ├── chart            紫微（已有）
    ├── bazi             八字（新建）
    ├── evidence         标签+融合（新建）
    └── shared-types     双视图类型（扩展）
    ↓
services/ai (FastAPI)
    ├── pipeline/        报告生成管道
    ├── content/         内容库
    ├── safety_check     伦理+术语剥离
    └── followup_router  追问树
```

### 5.2 报告生成管道

```python
def generate_plan_report(req):
    # 1. 规则层（不让 LLM 排盘）
    bazi = calculate_bazi(req.birth)
    ziwei = req.natal
    horoscope = req.horoscope

    # 2. 标签抽取（知识点）
    tags = extract_all_tags(bazi, ziwei, horoscope, req.real_context, req.topic)

    # 3. 内容检索（题库）
    snippets, coverage = retrieve_content(req.topic, tags)

    # 4. 证据融合 + 置信度（内部）
    evidence = merge_evidence(tags, coverage)

    # 5. LLM 生成内部卡片（含推导链）
    internal_cards = llm_generate_internal(evidence, snippets, req.topic)

    # 6. 安全 + 术语剥离 → 用户层
    user_plan = to_user_facing(internal_cards)
    user_plan = safety_check(user_plan)
    user_plan = terminology_strip(user_plan)

    return {
        "portrait": user_plan.portrait,
        "stage": user_plan.stage,
        "plans": user_plan.plans,
        "followUps": user_plan.follow_ups,
        "_internal": internal_cards,  # 仅 API 内部/调试，不下发移动端默认
    }
```

### 5.3 LLM 职责边界

| LLM 做 | LLM 不做 |
|--------|----------|
| 标签 → 生活语言 | 排盘、猜时辰 |
| 多源合成方案 | 高风险断言 |
| 根据 REAL 调整表达 | 编造用户未提供的事实 |
| 生成追问引导 | 输出命理术语给用户 |

---

## 6. 数据模型

### 6.1 用户可见报告（前台）

```typescript
// packages/shared-types/src/plan-report.ts

export type PlanTopic =
  | 'self_profile'
  | 'recent_years'
  | 'career' | 'marriage' | 'child' | 'parent' | 'family'
  | 'partner_conflict'
  | 'child_environment'
  | 'synastry'
  | 'family_system';

export interface PlanCard {
  id: string;
  title: string;           // 如「这几年在发生什么」
  body: string;            // 生活语言，无术语
  actions: string[];       // 可执行建议
  phrases?: string[];      // 可选：话术替换（关系场景）
}

export interface PlanReport {
  id: string;
  topic: PlanTopic;
  portrait: string;        // 一句话底色
  stage?: string;          // 阶段判断（近几年/今年）
  plans: PlanCard[];
  followUpQuestions: string[];
  disclaimer: string;
  coverageLevel: 'full' | 'partial' | 'minimal';  // 可展示「方案深度」提示
  createdAt: string;
}
```

### 6.2 内部证据（后台，MongoDB 可选分集合或嵌套）

```typescript
export type EvidenceSource = 'BZ' | 'ZW-M' | 'ZW-D' | 'ZW-Y' | 'REAL' | 'CHAT' | 'SYN';

export interface InternalAnalysisCard {
  id: string;
  conclusion: string;
  sources: { type: EvidenceSource; evidence: string }[];
  reasoning: string[];
  confidence: number;
  matchedContentIds: string[];
}
```

### 6.3 结构化现实补充（REAL 层）

扩展 `LifeContext`：

```typescript
export interface RealContext {
  relationshipStatus?: 'single' | 'dating' | 'married' | 'separated';
  hasChildren?: boolean;
  childAge?: number;
  parentHealthConcern?: boolean;
  cityChangeRecently?: boolean;
  financialPressure?: 'low' | 'medium' | 'high';
  careerStage?: string;
  partnerNotes?: string;
  currentConflict?: string;
  freeText?: string;
  chatSummary?: string;
  voiceDiaryEntries?: string[];
}
```

### 6.4 内容库飞轮条目

```typescript
export interface ContentContribution {
  id: string;
  source: 'v4_import' | 'user_conversation' | 'manual';
  topic: PlanTopic;
  tags: string[];
  userFacing: string;
  actions: string[];
  status: 'pending' | 'approved' | 'rejected';
  conversationRef?: string;  // bot session id
  createdAt: string;
}
```

---

## 7. API 设计

### 7.1 保留并改造

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/v1/chart/birth-profile` | 建档，同时算八字+紫微 |
| GET | `/v1/chart/birth-profile` | 返回命盘（**移动端默认不展示详情**） |
| GET | `/v1/chart/horoscope` | 大限流年结构 |
| GET/POST/DELETE | `/v1/chart/relations` | 关系人 |

### 7.2 新增（AnalysisModule）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/analysis/natal` | 单人底色方案 `{ topic: 'self_profile' }` |
| POST | `/v1/analysis/recent-years` | 近几年 `{ years?: [Y,Y+1,Y+2] }` |
| POST | `/v1/analysis/synastry` | 合盘 `{ relationId }` |
| POST | `/v1/analysis/child` | 儿童环境 `{ relationId }` |
| POST | `/v1/analysis/family-system` | 家庭系统（Phase 2） |
| GET | `/v1/analysis/reports/:id` | 方案报告详情（仅用户层字段） |
| POST | `/v1/analysis/reports/:id/export` | 导出 PDF（Phase 2） |

### 7.3 现实补充与追问

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/v1/chart/real-context` | 结构化 REAL 表单 |
| GET | `/v1/chart/real-context` | 查询 |
| POST | `/v1/followup/ask` | `{ topic, message, planCardId?, realContextPatch? }` |
| POST | `/v1/chart/chat-upload` | 聊天记录 → CHAT 分析（Phase 2） |

### 7.4 内容库运营（内部）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/internal/content/stats` | 库覆盖率统计 |
| GET | `/v1/internal/content/pending` | 待审核飞轮条目 |
| POST | `/v1/internal/content/approve` | 审核入库 |

### 7.5 下线

```
/v1/tests/*           MBTI/塔罗/手相/独立八字
/v1/social/discover   磁场匹配
POST /v1/chart/reports/natal|daxian|liunian  → 迁移至 /v1/analysis/*
```

---

## 8. 移动端改造

### 8.1 Tab 结构

| Tab | 现名 | 新名 | 说明 |
|-----|------|------|------|
| 1 | explore | 首页 | 建档 + 主题入口 |
| 2 | reports | 方案 | 方案报告列表 |
| 3 | mirror | 继续问 | 三层追问对话 |
| 4 | — | 家人 | 关系人 + 合盘入口（原 relations） |
| 5 | profile | 我的 | 设置、语言、导出 |

下线：`memorial`（磁场匹配）

### 8.2 核心页面

| 路径 | 功能 |
|------|------|
| `app/onboarding/intent.tsx` | 4 问引导（自己/关系、关心主题、风格、是否补现实） |
| `app/chart/setup.tsx` | 出生信息（保留真太阳时提示） |
| `app/analysis/topic.tsx` | 主题选择 |
| `app/analysis/real-context.tsx` | 结构化现实补充 |
| `app/report/[id].tsx` | **方案报告页**（底色 + 阶段 + 方案卡片） |
| `app/(tabs)/mirror.tsx` | 追问对话（关联 planCardId） |
| `app/chart/relations.tsx` | 家人档案 |

### 8.3 方案报告页 UI

```
┌─────────────────────────────────┐
│ 你的底色                         │
│ 「你是结构推动型…」              │
├─────────────────────────────────┤
│ 这几年                           │
│ 「外部机会在放大，家庭节奏变重…」 │
├─────────────────────────────────┤
│ 给你的方案                       │
│ ① 先稳定家庭节奏…                │
│ ② 讨论前先问，不先评              │
│ [为什么会这样？] [我该怎么开口？] │
├─────────────────────────────────┤
│ 安全边界说明                     │
│ [导出]（Phase 2）                │
└─────────────────────────────────┘
```

`coverageLevel === 'partial'` 时展示提示：「部分建议基于目前了解，补充更多信息可获得更贴合方案。」

### 8.4 追问对话（三层）

1. **短判断**：生活语言，不吓人  
2. **补现实**：引导填写/补充 structured REAL  
3. **更新方案**：返回新 planCard 或修订条目  

---

## 9. 分阶段开发计划

### Phase 0：准备（第 1 周）

- [ ] 评审本报告，确认范围
- [ ] 复制 v4 参考材料至 `docs/v4-reference/`（只读）
- [ ] 案例 A/B/C 固定输入 → `fixtures/case-a.json` 等
- [ ] 冻结 social/tests 新功能

**交付物**：`docs/V4_DEVELOPMENT_REPORT.md`（本文）、golden fixtures

---

### Phase 1：引擎与骨架库（第 2~4 周）

| 任务 | 负责人 | 产出 |
|------|--------|------|
| `packages/bazi` 四柱+五行+大运 | 后端 | 精确八字引擎 |
| `packages/evidence` 标签抽取 | 后端 | BZ/ZW-M/D/Y/REAL 标签 |
| 骨架库 JSON 化 ~300 条 | 产品+AI | `services/ai/content/` |
| `packages/shared-types` PlanReport | 全栈 | 类型契约 |
| `pipeline/generate_plan_report.py` | AI | 管道 v1 |
| `terminology_strip` + `safety_check` | AI | 用户层净化 |
| `POST /v1/analysis/natal` | API | 单人底色方案 |
| 方案报告页 UI | 移动端 | `report/[id].tsx` 改造 |

**里程碑**：案例 A 可生成并展示「底色 + 方案」无术语报告。

**验收**：

- 用户可见文本零命理术语（自动化扫描）
- 内部 `_internal` 含完整 evidence
- 库命中 0 时输出 `coverageLevel: minimal`

---

### Phase 2：主题流与追问（第 5~7 周）

| 任务 | 产出 |
|------|------|
| onboarding intent 4 问 | 用户入口对齐 v4 `14` |
| `real-context` 结构化表单 | REAL 标签入库 |
| `POST /v1/analysis/recent-years` | 近几年方案 |
| `POST /v1/analysis/synastry` / `child` | 关系简版（保守策略） |
| Bot 三层追问 + `followup_router` | 对话改造 |
| Tab 重构 + 下线 memorial/tests | 新 IA |
| 内容库扩展至 ~800 条 | 关系场景 |

**里程碑**：完整走通 v4 `14` 交互流程；用户可追问并更新方案。

---

### Phase 3：质量与飞轮（第 8~10 周）

| 任务 | 产出 |
|------|------|
| 内容库扩展 ~2000 条 | 关系话术加深 |
| 对话飞轮 v0 | pending → approve 流程 |
| `family-system` 报告 | Phase 2 功能 |
| 报告导出 PDF | MVP 第 7 项 |
| golden test 回归 | 对照案例 A/B/C |
| 英文方案层 | i18n |

**里程碑**：可对外演示；合盘/亲子达到可接受质量或明确标注 partial。

---

### Phase 4：中期（按需）

- 聊天上传分析（CHAT 标签）
- 家庭系统图
- 年度计划
- 向量检索大库
- 长报告分页（Demo 80 节级别）

---

## 10. 迁移与兼容

### 10.1 报告

```typescript
if (report.plans?.length) renderPlanReport(report);
else renderLegacySections(report);  // 旧报告只读
```

新报告只写 `PlanReport` 结构；旧 `sections` 保留 2 个版本后废弃。

### 10.2 用户数据

| 数据 | 处理 |
|------|------|
| birth-profile, relations | 保留，扩展 |
| life_context | 扩展结构化字段 |
| 旧 MBTI/塔罗报告 | 历史只读 |
| matchProfile, 社交好友 | 归档，不删除 |

---

## 11. 质量保障

### 11.1 自动化检查

| 检查项 | 方式 |
|--------|------|
| 术语剥离 | 用户层文本匹配禁词表（宫位、四化、武曲、甲木…） |
| 伦理边界 | `safety_check` 关键词 + 儿童专项规则 |
| 库覆盖率 | 每份报告记录 `matchedContentIds` |
| 回归 | 案例 A/B/C 固定输入快照对比 |

### 11.2 人工评审

- 每周抽检 10 份用户报告（前台方案层）
- 对照 v4 `19_好内容与坏内容对比`
- 儿童/伴侣报告 100% 人工审核（上线初期）

### 11.3 合格标准

1. 用户层无命理术语
2. 方案含 ≥1 条可执行 action
3. 通过 safety_check
4. 库不足时 `coverageLevel` 诚实降级
5. 追问后方案有合理变化（现实校准有效）

---

## 12. 风险与对策

| 风险 | 对策 |
|------|------|
| 内容库不足导致空泛 | coverage 降级 + 少说保守 |
| LLM 泄漏术语 | terminology_strip 后置 + 禁词扫描 |
| 八字引擎精度 | 案例 A 对齐 v4 四柱 golden test |
| 儿童/伴侣越界 | 专用 prompt + 人工审核 + 缩短输出 |
| 改造范围过大 | 分 Phase，Phase 1 只做单人底色 |
| 旧用户习惯断裂 | 旧报告只读 + 新 Tab 引导 |

---

## 13. 仓库变更清单（预估）

### 新建

```
packages/bazi/
packages/evidence/
services/ai/app/pipeline/
services/ai/app/content/
services/ai/app/services/safety_check.py
services/ai/app/services/terminology_strip.py
services/ai/app/routers/analysis.py
services/ai/app/routers/followup.py
services/api/src/analysis/
apps/mobile/app/onboarding/intent.tsx
apps/mobile/app/analysis/
apps/mobile/components/plan/
docs/v4-reference/          # 软链或复制 v4 材料
fixtures/case-a.json
```

### 大改

```
packages/shared-types/src/
services/ai/app/services/report_llm.py  → 拆分入 pipeline
services/api/src/chart/chart.service.ts → 报告生成迁出
services/api/src/schemas/report.schema.ts → 扩展 PlanReport
services/api/src/schemas/life-context.schema.ts
apps/mobile/app/report/[id].tsx
apps/mobile/app/(tabs)/mirror.tsx
apps/mobile/app/(tabs)/_layout.tsx
```

### 归档/下线

```
apps/mobile/app/(tabs)/memorial.tsx
apps/mobile/app/tests/*
services/api/src/social/          # 保留代码，路由下线
services/api/src/tests/           # 保留代码，路由下线
```

---

## 14. 团队分工建议

| 角色 | Phase 1~2 |
|------|-----------|
| 后端 | bazi + evidence + AnalysisModule API |
| AI 工程 | pipeline + content 骨架库 + safety + strip |
| 移动端 | 新 IA + 方案报告页 + real-context + 追问 |
| 产品/内容 | v4 摘库 300 条 + 案例验收 + 飞轮审核 |
| QA | golden test + 术语扫描 + 边界用例 |

---

## 15. 附录

### A. v4 材料阅读顺序（研发）

1. `01` 愿景 → `02` 信息层级 → `20` 实现说明  
2. `14` 交互 → `15` 追问树 → `16` 文案  
3. `08~12` 案例效果  
4. `内容库/` 按 Phase 分批消化  
5. `18` 伦理、`19` 好坏对比 → 写入 safety_check  

### B. 骨架库摘取优先级

1. `内容库/05` 原子库（最快提升人味）  
2. `内容库/11` + `01/02`（底色）  
3. `内容库/07` 大限流年（阶段）  
4. `内容库/09`（关系，Phase 2）  
5. `内容库/06`（场景推导，Phase 2~3）  

### C. 案例 A 验收输入

- 公历：1988-04-17 06:40，男  
- 期望用户层关键词：结构推动、外部机会、家庭节奏（无武曲、迁移等词）  

---

*本报告为 SoulMirror v4 对齐开发的唯一规格源。后续变更请更新版本号并记录于本文档顶部。*
