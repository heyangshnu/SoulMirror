# SoulMirror Archive 全量开发方案

> 版本：1.0  
> 日期：2026-06-16  
> 依据：[ARCHIVE_FULL_MIGRATION_PLAN.md](./ARCHIVE_FULL_MIGRATION_PLAN.md) + Archive `fate-and-fortune` + `guanxin-ui` 视觉参考  
> 目标：可交付给研发执行的 **后端 + 前端 + 联调 + 验收** 一体化方案

---

## 目录

1. [总览与交付边界](#1-总览与交付边界)
2. [前端设计方案（guanxin-ui 对齐 Archive）](#2-前端设计方案guanxin-ui-对齐-archive)
3. [后端详细方案](#3-后端详细方案)
4. [API 与 WebSocket 契约](#4-api-与-websocket-契约)
5. [分阶段实施与 Sprint 排期](#5-分阶段实施与-sprint-排期)
6. [联调与验收清单](#6-联调与验收清单)
7. [风险与决策记录](#7-风险与决策记录)

---

## 1. 总览与交付边界

### 1.1 终态用户旅程

```text
注册/登录
  → 填写出生信息（一次性，无「生成报告」文案）
  → 初始化进度页（L0 + 伏羲 16 节点，2~8 分钟）
  → 今天 Tab（五轴总览 + 当前话题 + 对话入口）
  → 全屏菩萨对话（流式，不等待后台记忆写完）
  → 后台：功曹 → 罗汉 → Basic Memory 沉淀
  → 记忆 Tab：待印证 Confirm / Not sure
  → 话题/关系 Tab：查看愿/境/缘 话题网
  → 跨轴事件：一事影响多域时可跳转关联
```

### 1.2 交付物清单

| 类别 | 交付物 |
|------|--------|
| 后端 | `services/agent-host` Docker 镜像、NestJS AgentModule、MongoDB 索引 schema |
| 前端 | 4 Tab IA、12+ 页面、WSS 客户端、design tokens 迁移 |
| 数据 | Basic Memory 目录规范、life_context 迁移脚本 |
| 测试 | 中文 100 轮 harness、术语 strip 测试、init E2E |
| 运维 | docker-compose 生产配置、Nginx WSS、diagnose 脚本 |
| 文档 | 本方案 + ADR + 运维手册 |

### 1.3 v4 → Archive 页面映射

| v4 现有 | Archive 终态 | 动作 |
|---------|-------------|------|
| `(tabs)/explore` 今天 | `(tabs)/today` 五轴首页 | **重写** |
| `(tabs)/reports` 我的方案 | 合并进「话题」+ 01_命报告索引 | **改造** |
| `(tabs)/profile` 我的 | `(tabs)/profile` 账号+设置 | **保留精简** |
| `onboarding/intent` 生成方案 | 删除；改为对话引导 | **删除** |
| `report/[id]` 报告页 | `topic/[id]` 话题详情 / `ming/report/[code]` | **改造** |
| `report/followup` | `chat/index` 全屏菩萨 | **替换** |
| `chart/setup` | 保留 + init 进度 | **增强** |
| MBTI/塔罗/手相/social | — | **归档 href:null** |

---

## 2. 前端设计方案（guanxin-ui 对齐 Archive）

### 2.1 设计原则

| 原则 | guanxin-ui | Archive 要求 | SoulMirror 决策 |
|------|-----------|-------------|----------------|
| 气质 | 暖色 mindful、水彩插画 | 生活语言、非玄学 | **采用 guanxin 暖色版** |
| 信息架构 | Today/Topics/Relationships/Memory | 五轴 + 对话 | **4 Tab + 隐藏五轴 Dashboard** |
| 对话 | 底栏 Ask anything | 菩萨主线 | **全屏 chat + 首页快捷输入** |
| 记忆 | Pending confirm | 待印证 | **1:1 复用 Memory 页模式** |
| 禁止 | 进度环%、雷达图 | 无置信度/评分 | **不做进度环、不做雷达** |

### 2.2 Design Tokens（guanxin 暖色 → 心镜）

新建 `apps/mobile/theme/guanxin.ts`，Phase 5 起逐步替换 `tokens.ts`：

```typescript
// 品牌：心镜 SoulMirror · 暖色 mindful（参考 guanxin-ui 图 1/2/4/5/6）
export const guanxinColors = {
  primary: '#B85C38',           // 陶土色 CTA（原 v4 紫 #7C6CF0 废弃）
  primaryLight: '#D4845F',
  primaryMuted: '#F5E6DE',
  sage: '#6B8F71',              // 状态 Active / 成功
  sageMuted: '#E8F0E9',
  amber: '#C9A227',             // Review / 待印证
  background: '#FDFBF9',        // 暖白底
  backgroundSecondary: '#F5F0EB',
  card: '#FFFFFF',
  text: '#2C2416',
  textSecondary: '#6B5E4F',
  textMuted: '#A89888',
  border: '#EBE4DC',
  danger: '#C44B4B',
};

export const guanxinTypography = {
  // 标题：系统 serif 或 expo-google-fonts Lora
  hero: { fontFamily: 'Lora_600SemiBold', fontSize: 28 },
  title: { fontFamily: 'Lora_600SemiBold', fontSize: 20 },
  body: { fontFamily: 'System', fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: 'System', fontSize: 14, color: textSecondary },
};
```

**插画**：hero 区使用本地 assets（水彩 landscape PNG），不用远程图；命盘轴用抽象「时间线」插画，禁止星盘/八卦图。

### 2.3 导航结构

```text
(tabs)/
  today.tsx          # 今天：五轴总览 + 当前话题 + 输入栏
  topics.tsx         # 话题：愿+境 话题网列表
  relations.tsx      # 关系：缘域
  memory.tsx         # 记忆：待印证 + 最近
  profile.tsx        # 我的：账号、出生信息、设置

stack/
  chat/index.tsx           # 全屏菩萨对话（WSS）
  chart/setup.tsx          # 出生信息
  onboarding/init-progress.tsx  # 伏羲 16 节点进度
  dashboard/axes.tsx       # 五轴 Dashboard（从 Today 进入）
  dashboard/axis/[domain].tsx   # 单轴详情 命|愿|境|缘|力
  topic/[id].tsx           # 话题详情（AI Summary + Evidence）
  relation/[id].tsx        # 关系人详情
  memory/pending.tsx       # 待印证列表
  memory/item/[id].tsx     # 单条记忆详情
  memory/event/[id].tsx    # 跨轴事件关联
  ming/report/[code].tsx   # 伏羲报告只读（A01~D28）
```

### 2.4 页面线框与组件（逐屏）

#### P1 · 今天 Tab (`today.tsx`) — 参考 guanxin 图1

```text
┌─────────────────────────────────┐
│ 心镜 SoulMirror            [头像] │
│ Good morning, {nickname}         │
│ 继续你的旅程，我们记得你说过的话。   │
├─────────────────────────────────┤
│ [Hero Card · 水彩背景]            │
│ CURRENT TOPIC · 当前话题          │
│ {topicTitle}                     │
│ {oneLineSummary}                 │
│ [继续对话 →]                      │
├─────────────────────────────────┤
│ [Guanxin guidance 卡片]           │
│ 菩萨短建议（1~2 句，非长文）        │
│ [查看相关 →]                      │
├─────────────────────────────────┤
│ 五轴一览                    [展开] │
│ ┌命┐ ┌愿┐ ┌境┐ ┌缘┐ ┌力┐        │
│ │摘要│ │摘要│ │摘要│ │摘要│ │摘要│   │
│ └──┘ └──┘ └──┘ └──┘ └──┘        │
├─────────────────────────────────┤
│ 最近动态                          │
│ · {topic} · 昨天                  │
│ · {topic} · 5月19日               │
├─────────────────────────────────┤
│ [✦ Ask 心镜 anything...    [🎤]] │  → 跳转 chat
└─────────────────────────────────┘
 Tab: 今天 | 话题 | 关系 | 记忆
```

**数据源**：
- `GET /v1/memory/dashboard` → 五轴摘要
- `GET /v1/memory/current-topic` → 当前活跃话题
- 菩萨 guidance：dashboard 内嵌或最近一次对话摘要

**组件**：`HeroTopicCard`, `GuidanceCard`, `AxisOverviewRow`, `RecentActivityList`, `ChatInputBar`

---

#### P2 · 话题 Tab (`topics.tsx`) — 参考 guanxin 图2/7

```text
Topics · 探索对你重要的事
[Search...] [filter]

[All] [Active] [Review] [Archived]   ← 不用百分比进度环

┌─────────────────────────────────┐
│ [圆图] Relationships             │
│ Communication with Emma          │
│ 描述一行…                        │
│ Active · Updated 2h ago      >   │
└─────────────────────────────────┘
```

**Archive 映射**：列表来自 `02_愿/` + `03_境/` topic index；状态 `active | pending_confirmation | archived`，**无 insights 计数**。

**详情 `topic/[id].tsx`** — 参考 guanxin 图4/8：

```text
Tabs: 概览 | 洞察 | 下一步 | 历史

[AI Summary 卡片]          ← 菩萨/伏羲摘要，生活语言
[Key Evidence 列表]        ← Reflection(用户原话) / Memory(系统记录)
  标签：Fulfillment, Growth  ← 开放 tags，非固定字段

[Continue reflection →]    ← 进 chat，带 topicContext
```

---

#### P3 · 关系 Tab (`relations.tsx`) — 参考 guanxin 图5/9

```text
Relationships ·  nurture connections

[All] [Family] [Partner] [Friends] [Work]

┌─ Featured: Emma ────────────────┐
│ [photo] Partner                  │
│ 关系阶段 · 最近事件一行            │
│ [查看完整 →]                      │
│                                  │
│ 最近怎么相处（文字，非雷达图）      │
│ · 你在倾听方面做得不错             │
│ · 固定相处时间可以加强纽带          │
│ [Plan intentional time]          │
└──────────────────────────────────┘

列表：Dad / Sophie / …
Recent interactions
```

**Archive 映射**：`04_缘/`；五类关系 filter；**禁止** Trust/Openness 雷达图（guanxin 蓝版有，我们不做）。

**数据**：`GET /v1/memory/domain/yuan` + `/chart/relations` 元数据合并。

---

#### P4 · 记忆 Tab (`memory.tsx`) — 参考 guanxin 图6/10

```text
Memory · 你的反思、记忆与洞察

[Search] [All|Notes|Memories|Insights]

── Pending memories to confirm ──
┌─────────────────────────────────┐
│ [thumb] Conversation             │
│ 「你说过想回上海…」               │
│ [✓ Confirm]  [? Not sure]        │
└─────────────────────────────────┘

── Recent memories & notes ──
· Morning reflection · Today
· Voice note · Yesterday

Your memory is private and editable.
[Learn more]
```

**Archive 映射**：`POST /v1/memory/confirm`；status `pending_confirmation → active`；原文展示用户原话。

---

#### P5 · 全屏对话 (`chat/index.tsx`)

```text
┌─────────────────────────────────┐
│ ← 返回    与心镜对话               │
├─────────────────────────────────┤
│ [消息列表 · 流式 delta]           │
│ User: …                          │
│ 心镜: …（先接住→结构→判断→下一步） │
├─────────────────────────────────┤
│ [输入框]              [发送]       │
└─────────────────────────────────┘
```

**技术**：`useBodhisattvaChat` hook；WSS `type: delta | done | error`；历史从 `GET /v1/agent/transcript` 或本地 cache；**不在此页显示 suggestion chips**（与 v4 followup 一致）。

**Reply 模式**（Archive BODHISATTVA_ENGINE）：先接住 → 拆结构 → 判断 → 1~2 可执行下一步 → 自然留待印证入口。

---

#### P6 · 建档 + 初始化

**`chart/setup.tsx`**（已有改造方向）：
- 标题「填写出生信息」；按钮「保存并继续」
- 无 ReportGeneratingOverlay

**`onboarding/init-progress.tsx`**（新建）：

```text
正在搭建你的底色…
████████░░░░  8/16  当前十年深解

L0 排盘 ✓
A01 本命总解 ✓
A02 八字气候 ✓
…
B09 不会初始化（用户不可见）
```

**WSS 事件**：`fuxi_node_done`, `fuxi_init_done`, `fuxi_init_failed`

---

#### P7 · 五轴 Dashboard (`dashboard/axes.tsx`) — Archive DEMO_SCOPE 核心，guanxin 需补画

```text
Person Dashboard · {nickname}

┌─ 命盘轴 ─────────────────────┐
│ L2 当前大周期：{生活语言一句}    │
│ L3 今年主题：{生活语言一句}      │
│ [查看时间骨架 →]               │
└──────────────────────────────┘
┌─ 执行轴（愿）─┐ ┌─ 环境轴（境）─┐
┌─ 关系轴（缘）─┐ ┌─ 资源轴（力）─┐

点击轴 → dashboard/axis/[domain]
```

**命盘轴展示规则**：
- 只显示 L2/L3 生活语言摘要（来自 B07/B10 节点 strip 后）
- L0/L1 在详情页，默认折叠
- **绝不**出现宫位、星曜、八字术语

---

#### P8 · 跨轴事件 (`memory/event/[id].tsx`)

```text
这件事同时影响了：

[愿] 回上海的目标增强
[境] 城市迁移压力
[力] 现金流承载不足

[查看各轴详情]
```

**数据**：Basic Memory relations + API 聚合。

---

### 2.5 共享组件库（新建）

| 组件 | 路径 | 用途 |
|------|------|------|
| `HeroTopicCard` | `components/guanxin/HeroTopicCard.tsx` | 今天 hero |
| `GuidanceCard` | `components/guanxin/GuidanceCard.tsx` | 菩萨短建议 |
| `AxisChip` | `components/guanxin/AxisChip.tsx` | 五轴摘要 chip |
| `TopicListCard` | `components/guanxin/TopicListCard.tsx` | 话题列表项 |
| `EvidenceRow` | `components/guanxin/EvidenceRow.tsx` | Reflection/Memory |
| `PendingMemoryCard` | `components/guanxin/PendingMemoryCard.tsx` | Confirm/Not sure |
| `RelationFeaturedCard` | `components/guanxin/RelationFeaturedCard.tsx` | 关系 featured |
| `ChatInputBar` | `components/guanxin/ChatInputBar.tsx` | 底栏输入 |
| `InitProgressList` | `components/guanxin/InitProgressList.tsx` | 16 节点进度 |
| `WatercolorHeader` | `components/guanxin/WatercolorHeader.tsx` | 顶部插画背景 |

### 2.6 前端工程任务

| 任务 | 文件 | Phase |
|------|------|-------|
| design tokens | `theme/guanxin.ts` | 5 |
| expo-font Lora | `app/_layout.tsx` | 5 |
| Tab 重构 | `(tabs)/_layout.tsx` | 5 |
| WSS client | `lib/agent-ws.ts` | 4 |
| `useBodhisattvaChat` | `hooks/useBodhisattvaChat.ts` | 4 |
| memory API client | `lib/memory-api.ts` | 5 |
| i18n zh/en | `lib/i18n/locales/*.ts` | 5 |
| 归档旧路由 | href:null | 5 |

### 2.7 eas.json 新增

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.soulzenai.com/v1",
        "EXPO_PUBLIC_AGENT_WS_URL": "wss://api.soulzenai.com/v1/agent/stream"
      }
    }
  }
}
```

---

## 3. 后端详细方案

### 3.1 服务拓扑

```text
                    Internet
                       │
                   Nginx :443
                       │
         ┌─────────────┴─────────────┐
         │                           │
    /v1/*  → PM2 API :3010     /v1/agent/* → Docker :8787
         │                           │
    MongoDB :27017              Basic Memory volumes
```

### 3.2 services/agent-host 模块分解

| 模块 | 源文件 | 职责 |
|------|--------|------|
| Host Server | `host/src/server.ts` | HTTP/WS、session、turn 调度 |
| Claude Runner | `host/src/claude-code-runner.ts` | `claude -p` 进程管理 |
| Chart MCP | `mcp/src/chart-server.ts` | L0 排盘，调用 chart/bazi 包 |
| Memory MCP | `mcp/src/memory-server.ts` | role-scoped 读写 |
| Agents | `agents/*.md` | 菩萨/功曹/罗汉/伏羲 soul |
| Fuxi Nodes | `fuxi-nodes/**` | 50 节点 prompt |

**迁入步骤**：
1. 复制 Archive → `services/agent-host/`
2. Chart MCP 改为调用 NestJS 内网 API 或独立 node 脚本读 `@soulmirror/chart`
3. slug 规范：`u_{userId}`
4. JWT middleware：NestJS 签发 `agentToken`，Host 校验

### 3.3 NestJS AgentModule

```text
services/api/src/agent/
  agent.module.ts
  agent.controller.ts      # HTTP: init-status, dashboard, memory/*
  agent.gateway.ts         # WSS 代理 → agent-host
  agent.service.ts         # 内网 fetch 8787
  dto/
  schemas/
    agent-init-status.schema.ts
    agent-run.schema.ts
    memory-index.schema.ts   # MongoDB 索引，非真源
```

**birth-profile 钩子**（`chart.service.ts`）：

```typescript
async upsertBirthProfile(userId, dto) {
  const profile = await this.save(...);
  await this.agentService.triggerInit(userId, profile); // POST agent-host /init
  return profile;
}
```

### 3.4 MongoDB 索引 Schema（非记忆真源）

```typescript
// agent_init_status
{ userId, phase: 'pending'|'running'|'done'|'failed', fuxiNodesDone: 0-16, error?, updatedAt }

// agent_runs
{ userId, runId, turn, startedAt, endedAt, eventsCount, contractErrors }

// memory_index_cache（可选，加速 dashboard）
{ userId, domain: 'ming'|'yuan'|'jing'|'yuan_rel'|'li', summary, updatedAt }
```

真源始终在 Basic Memory Markdown；Mongo 仅缓存摘要，可失效重建。

### 3.5 功曹 / 罗汉 workflow（Archive 对齐）

```text
Turn N:
  1. User message → WS → Host
  2. Host → Bodhisattva (stream) → User deltas
  3. Bodhisattva done → post_turn_packet → Gongcao inbox (async)
  4. Gongcao serial:
     - read routing-memory
     - action: NO_ACTION | LOG_ONLY | DISPATCH_LUOHAN | TRIGGER_FUXI | MIXED
     - multicast envelopes to Luohan(s)
  5. Luohan batch → memory.write_* → receipt → Gongcao
  6. Host emit background_idle event (optional UI toast: "已记住")
```

**禁止**：
- 菩萨写 domain notes
- 功曹改 02~05 目录
- 单轮 receipt 触发无限 cascade（Archive GONGCAO_ROUTING 规则）

### 3.6 记忆治理（Phase 6）

| Job | 频率 | 动作 |
|-----|------|------|
| `compact-routing-memory` | 每日 | 压缩 `06_功曹/routing-memory.md` |
| `merge-duplicate-observations` | 每周 | 罗汉域内合并 |
| `archive-outdated` | 每月 | 移入 `08_归档/` |
| `rebuild-index-cache` | 每日 | 刷新 Mongo memory_index_cache |

### 3.7 Docker 生产配置

```yaml
# services/agent-host/docker-compose.prod.yml
services:
  soulmirror-agent:
    container_name: soulmirror-agent
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:8787:8787"
    env_file: .env
    volumes:
      - /data/agent-runtime:/app/runtime
      - /data/memory-projects:/app/memory-projects
    deploy:
      resources:
        limits:
          memory: 12G
```

### 3.8 v4 services/ai 退役计划

| Phase | services/ai 状态 |
|-------|-----------------|
| 0–4 | 保留；`AGENT_MODE=legacy` 可回退 |
| 5 | PDF 导出暂留 ai 或迁 agent-host |
| 6 | 停止 pm2 soulmirror-ai；代码归档 |

---

## 4. API 与 WebSocket 契约

### 4.1 HTTP

```typescript
// 初始化
POST   /v1/agent/init              // 手动重试（需 JWT）
GET    /v1/agent/init-status         // { phase, progress, nodes: [{code,title,done}] }

// 五轴 Dashboard
GET    /v1/memory/dashboard          // { ming, yuan, jing, yuanRel, li, currentTopic? }
GET    /v1/memory/domain/:domain     // ming|yuan|jing|yuan_rel|li → { layers, topics[] }
GET    /v1/memory/topics             // ?status=active|review|archived
GET    /v1/memory/topics/:id         // AI summary + evidence[]
GET    /v1/memory/pending            // 待印证列表
POST   /v1/memory/confirm            // { noteId, action: 'confirm'|'reject' }
GET    /v1/memory/events/:id         // 跨轴关联

// 伏羲报告
GET    /v1/ming/reports              // A01~D28 列表
GET    /v1/ming/reports/:code        // 生活语言正文（已 strip）

// 对话历史
GET    /v1/agent/transcript          // ?limit=50 最近消息（审计副本）
```

### 4.2 WebSocket

**连接**：`wss://api.soulzenai.com/v1/agent/stream?token={jwt}`

**Client → Server**：

```json
{ "type": "user_message", "text": "...", "topicId?": "...", "layer?": 1 }
{ "type": "ping" }
```

**Server → Client**：

```json
{ "type": "delta", "text": "..." }
{ "type": "done", "turnId": "...", "fullText": "..." }
{ "type": "background", "status": "gongcao_running" | "memory_updated" }
{ "type": "init_progress", "node": "B07", "done": 8, "total": 16 }
{ "type": "init_done" }
{ "type": "init_failed", "error": "..." }
{ "type": "error", "message": "..." }
```

### 4.3 术语 Strip（API 层强制）

所有 `GET /v1/memory/*` 和 `GET /v1/ming/reports/*` 响应经 `terminologyStrip()` 过滤；禁词表继承 v4 `services/ai/app/services/terminology_strip.py`，在 NestJS 实现 TS 版。

---

## 5. 分阶段实施与 Sprint 排期

> 2 后端 + 1 前端 + 0.5 QA ≈ **28 周**；Sprint = 2 周

### Sprint 1–2（Phase 0）· 基线

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| B-001 | Archive → `services/agent-host/` | BE | 目录存在 |
| B-002 | docker compose smoke | BE | health 200 |
| B-003 | MiniMax + Ark .env | BE | tesla segment PASS |
| B-004 | ADR 文档 | ALL | 评审通过 |
| B-005 | 服务器 /data volume | Ops | 可写 |
| F-001 | eas.json WS URL 占位 | FE | 编译通过 |

### Sprint 3–5（Phase 1）· Agent Host 生产化

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| B-010 | Chart MCP ↔ soulmirror chart/bazi | BE | L0 JSON 一致 |
| B-011 | 中文 fixture 100 条 | QA | 无架构术语 |
| B-012 | `test:live:zh100` harness | BE | segment PASS |
| B-013 | diagnose-agent.sh | Ops | 脚本可跑 |
| B-014 | Agent soul 品牌中文化 | BE | prompt 审查 |

### Sprint 6–8（Phase 2）· API 集成

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| B-020 | AgentModule + JWT | BE | 401 无 token |
| B-021 | WSS 代理 gateway | BE | wscat 连通 |
| B-022 | init-status API | BE | 状态正确 |
| B-023 | birth-profile → init 钩子 | BE | 建档触发 init |
| B-024 | Nginx WSS 300s timeout | Ops | 长连不断 |
| F-010 | `lib/agent-ws.ts` 骨架 | FE | 连上 echo |

### Sprint 9–11（Phase 3）· 伏羲 16 节点

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| B-030 | Fuxi 16 parallel init | BE | 16/16 done |
| B-031 | B09 block 静态验证 | BE | 无 B09 文件 |
| B-032 | init_progress WSS 事件 | BE | App 可收 |
| B-033 | GET /v1/ming/reports | BE | strip 后无术语 |
| F-020 | init-progress 页 | FE | 进度条正确 |
| F-021 | setup 页联调 | FE | 建档 → init |

### Sprint 12–14（Phase 4）· 全 Agent 链路

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| B-040 | 菩萨 WSS 流式 | BE | delta 连续 |
| B-041 | post-turn → 功曹 inbox | BE | JSONL 有记录 |
| B-042 | 四罗汉 dispatch | BE | receipt 写入 |
| B-043 | TRIGGER_FUXI 按需 | BE | 缺节点时补 |
| F-030 | `useBodhisattvaChat` | FE | 流式显示 |
| F-031 | chat/index 全屏页 | FE | 20 轮可用 |
| B-044 | 退役 bot 主链开关 | BE | legacy 可切 |

### Sprint 15–17（Phase 5）· 前端 IA + guanxin UI

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| F-040 | guanxin design tokens | FE | 全局生效 |
| F-041 | 4 Tab 重构 | FE | 导航正确 |
| F-042 | today 五轴首页 | FE | 对照线框 P1 |
| F-043 | topics 列表+详情 | FE | 对照 P2 |
| F-044 | relations 页 | FE | 无雷达 P3 |
| F-045 | memory 待印证 | FE | Confirm API P4 |
| F-046 | dashboard/axes | FE | 五轴 P7 |
| F-047 | memory/event 跨轴 | FE | P8 |
| F-048 | i18n 全量 | FE | zh 完整 |
| B-050 | memory dashboard API | BE | 对接 F-042~047 |

### Sprint 18–19（Phase 6）· 性能 + E2E + 切流

| 任务 ID | 任务 | 负责 | 验收 |
|---------|------|------|------|
| B-060 | active index 各域 | BE | 功曹 p95<30s |
| B-061 | 记忆沉降 job | BE | 体积可控 |
| B-062 | zh100 全量 PASS | QA | contract=0 |
| B-063 | AGENT_MODE=claude 默认 | Ops | 7 天无 P0 |
| B-064 | 停 soulmirror-ai | Ops | pm2 仅 api+agent |
| F-060 | EAS preview 生产包 | FE | 真机全流程 |

### Sprint 20+（Phase 7）· 产品化

PDF 导出、家人跨 slug、计费钩子、TestFlight。

---

## 6. 联调与验收清单

### 6.1 端到端场景（必须全过）

| # | 场景 | 步骤 | 期望 |
|---|------|------|------|
| E1 | 新用户建档 | 注册→出生信息→init | 16 节点 done，进 Today |
| E2 | 首次对话 | Today→chat→发消息 | 流式回复 <5s 首字 |
| E3 | 记忆沉淀 | 对话 3 轮→Memory | 有待确认项 |
| E4 | 确认记忆 | Confirm | status→active |
| E5 | 拒绝记忆 | Not sure | 不进入 active |
| E6 | 话题可见 | Topics | 列表有 Active 项 |
| E7 | 关系 | Relations | 家人出现，无评分 |
| E8 | 五轴 | Dashboard | 五轴摘要生活语言 |
| E9 | 跨轴 | 触发迁移话题 | event 页多轴 |
| E10 | 术语 | 抽检 10 份输出 | 0 术语 |
| E11 | 100 轮 | harness | contract=0 |
| E12 | 重启 | docker restart | 记忆不丢 |

### 6.2 前端 UI 验收（guanxin 对照）

| 页面 | 参考图 | 必达 |
|------|--------|------|
| Today | guanxin 图1 | hero + guidance + 底栏输入 |
| Topics | guanxin 图2 | 卡片列表，无进度环 |
| Topic 详情 | guanxin 图4/8 | AI Summary + Evidence |
| Relations | guanxin 图5 | featured + 列表，无雷达 |
| Memory | guanxin 图6 | Pending confirm |
| Chat | — | 全屏流式 |
| Init | — | 16 节点进度 |
| 五轴 | Archive DEMO | guanxin 无，必须补 |

### 6.3 性能指标

| 指标 | 目标 |
|------|------|
| 菩萨首字延迟 | p95 < 8s |
| 菩萨完整回复 | p95 < 60s |
| 功曹后台 | p95 < 30s（100 轮后） |
| Init 16 节点 | < 10 min |
| App 冷启动 | < 3s |

---

## 7. 风险与决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 视觉 | guanxin 暖色，弃 v4 紫 | 更贴近 mindful 产品气质 |
| 进度环/雷达 | 不做 | Archive 禁止暴露评分 |
| 记忆真源 | Basic Memory | Archive 验证 |
| API 网关 | NestJS 保留 | 账号/鉴权已有 |
| Agent 运行时 | Docker + Claude Code | Archive ISSUE 经验 |
| Tab 数量 | 4 | guanxin 对齐；五轴从 Today 进入 |
| 品牌名 | 心镜 SoulMirror | 不用 Guanxin 对外 |

---

## 附录 A · 文件创建清单（前端）

```text
apps/mobile/theme/guanxin.ts
apps/mobile/lib/agent-ws.ts
apps/mobile/lib/memory-api.ts
apps/mobile/hooks/useBodhisattvaChat.ts
apps/mobile/hooks/useInitProgress.ts
apps/mobile/hooks/useMemoryDashboard.ts
apps/mobile/components/guanxin/*.tsx          (10 组件)
apps/mobile/app/(tabs)/today.tsx
apps/mobile/app/(tabs)/topics.tsx
apps/mobile/app/(tabs)/relations.tsx
apps/mobile/app/(tabs)/memory.tsx
apps/mobile/app/chat/index.tsx
apps/mobile/app/onboarding/init-progress.tsx
apps/mobile/app/dashboard/axes.tsx
apps/mobile/app/dashboard/axis/[domain].tsx
apps/mobile/app/topic/[id].tsx
apps/mobile/app/relation/[id].tsx
apps/mobile/app/memory/pending.tsx
apps/mobile/app/memory/item/[id].tsx
apps/mobile/app/memory/event/[id].tsx
apps/mobile/app/ming/report/[code].tsx
```

## 附录 B · 文件创建清单（后端）

```text
services/agent-host/                          (Archive 迁入)
services/api/src/agent/**
services/api/src/memory/**                    (dashboard 读代理)
scripts/diagnose-agent.sh
scripts/migrate-life-context-to-memory.ts
scripts/jobs/compact-routing-memory.sh
scripts/jobs/rebuild-index-cache.ts
tests/e2e/zh100.mjs
docs/ADR_ARCHIVE_MIGRATION.md
```

---

*本方案与 [ARCHIVE_FULL_MIGRATION_PLAN.md](./ARCHIVE_FULL_MIGRATION_PLAN.md) 配套使用；Sprint 任务可导入项目管理工具跟踪。*
