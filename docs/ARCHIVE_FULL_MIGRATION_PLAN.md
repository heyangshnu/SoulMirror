# SoulMirror × Archive 全量迁移开发计划书

> 版本：1.0  
> 日期：2026-06-16  
> 目标：**一次性达到** `fate-and-fortune` Archive 原型所验证的能力与效果  
> 模型：**MiniMax M3**（菩萨/功曹/罗汉）+ **火山 Ark**（伏羲 deepseek-v4-pro + 降级）  
> 策略：**v4 monorepo 演进**，新增 `services/agent-host`，非从零新仓库

---

## 1. 项目目标

### 1.1 一句话

将 SoulMirror 从「标签管道 + 单次 LLM 报告」升级为 Archive 所验证的 **以人为中心的长期理解系统**：

```text
L0 排盘资产 + 伏羲 16 节点地基
+ 菩萨即时对话（前台）
+ 功曹后置分发
+ 四罗汉五域记忆（Basic Memory）
+ 待印证 / 跨轴关联 / 全链路审计
```

### 1.2 成功标准（对齐 Archive E2E）

| # | 验收项 | 标准 |
|---|--------|------|
| 1 | 建档后初始化 | L0 Chart Asset + 伏羲 16 节点全部成功；B09 **不**初始化 |
| 2 | 对话主线 | 用户输入 → 菩萨 **立即**流式回应（不等待后台写完） |
| 3 | 记忆支线 | 每轮 post-turn → 功曹 dispatch → 罗汉写 Basic Memory |
| 4 | 五域结构 | 01命 02愿 03境 04缘 05力 06功曹 目录可读、可审计 |
| 5 | 原文策略 | 用户原话保留；推测标 `pending_confirmation`；App 可 Confirm / Not sure |
| 6 | 100 轮 E2E | 中文真实用户语料；`contract_errors = 0` |
| 7 | 前台边界 | 无命理术语；无置信度数字；无关系雷达评分 |
| 8 | 生产可用 | JWT 鉴权、volume 持久化、pm2/docker 稳定运行 |

### 1.3 明确不做（Archive 共识）

- 向用户展示命盘术语、宫位、星曜
- B09 全生命周期流年预初始化
- 菩萨直接写长期记忆
- 功曹修改领域 note
- PostgreSQL / 图数据库主链（v1 全量阶段）
- 社交匹配、MBTI/塔罗/手相主路径

---

## 2. 终态架构

```text
┌──────────────────────────────────────────────────────────────────┐
│  apps/mobile (Expo)                                               │
│  Tab: 今天 | 话题 | 关系 | 记忆                                    │
│  + 全屏菩萨对话 (WSS) + 五轴 Dashboard + 待印证流 + 建档/init 进度  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS + WSS (JWT)
┌────────────────────────────▼─────────────────────────────────────┐
│  services/api (NestJS) — 网关层                                    │
│  auth · user · birth-profile · relations · agent proxy · audit 索引 │
└────────────────────────────┬─────────────────────────────────────┘
                             │ 内网 HTTP/WS
┌────────────────────────────▼─────────────────────────────────────┐
│  services/agent-host (Archive 迁入) — 核心大脑                     │
│  Thin Host · Claude Code Runner · Basic Memory MCP · Chart MCP     │
│  Agents: 菩萨 · 功曹 · 愿/境/缘/力罗汉 · 伏羲                       │
└──────┬───────────────────────────────────────────────────────────┘
       │
       ├── /data/memory-projects/{userId}/   Basic Memory Markdown 真源
       ├── /data/agent-runtime/              Claude Code state + JSONL 审计
       └── MiniMax M3 / Ark deepseek-v4-pro

┌──────────────────────────────────────────────────────────────────┐
│  MongoDB — 索引层（非记忆真源）                                     │
│  users · birth-profiles · relations · agent_runs · init_status     │
└──────────────────────────────────────────────────────────────────┘

packages/chart + packages/bazi → L0 Chart Asset 事实计算（Host 调用）
```

---

## 3. 模型与 API 配置

### 3.1 必需账号

| 平台 | 用途 | 环境变量 |
|------|------|----------|
| **MiniMax** | 菩萨、功曹、四罗汉 | `MINIMAX_API_KEY`, `MINIMAX_ANTHROPIC_BASE_URL` |
| **火山 Ark** | 伏羲 16 节点、降级 | `ARK_API_KEY`, `ARK_ANTHROPIC_BASE_URL` |
| **Claude Code CLI** | Agent 运行时（Docker 内置） | `CLAUDE_CODE_BIN=claude` |

> **不需要** Anthropic 官方 Claude API。DeepSeek 直连（v4）双轨期可保留，全量切流后归档。

### 3.2 角色 → 模型映射

```bash
CLAUDE_MODEL_BODHISATTVA=MiniMax-M3
CLAUDE_MODEL_GONGCAO=MiniMax-M3
CLAUDE_MODEL_LUOHAN=MiniMax-M3
CLAUDE_MODEL_FUXI=deepseek-v4-pro          # 走 Ark Agent Plan
CLAUDE_FALLBACK_MODEL=ark-code-latest
MINIMAX_ENABLED=1
FUXI_INIT_CONCURRENCY=5
```

### 3.3 超时（继承 Archive ISSUE-017）

| 角色 | 默认 timeout |
|------|-------------|
| 菩萨 | 240s |
| 功曹 | 180s |
| 罗汉 | 240s |
| 伏羲单节点 | 900s |

---

## 4. 仓库结构变更

```text
SoulMirror/
├── apps/mobile/                    # 大改：IA + WSS + 五轴 UI
├── services/
│   ├── api/                        # 瘦身 + agent 代理模块
│   ├── agent-host/                 # 【新建】Archive 完整迁入
│   │   ├── host/                   # server.ts, claude-code-runner.ts
│   │   ├── mcp/                    # chart, memory, methodology
│   │   ├── agents/                 # bodhisattva, gongcao, luohan-*, fuxi
│   │   ├── fuxi-nodes/             # 50 节点 prompt（16 init + 按需）
│   │   ├── commands/
│   │   ├── docker-compose.yml
│   │   └── .env.production.example
│   └── ai/                         # 过渡期保留 PDF；Phase 6 归档
├── packages/chart, bazi/           # 保留，供 L0
├── scripts/
│   ├── server-deploy.sh            # 增加 agent-host
│   ├── diagnose-agent.sh           # 【新建】
│   └── test-live-100-zh.mjs        # 【新建】中文 100 轮
└── docs/
    └── ARCHIVE_FULL_MIGRATION_PLAN.md  # 本文档
```

---

## 5. 开发阶段（全量，约 28 周）

> 小团队：1 Agent 后端 + 1 移动端 + 0.5 测试/产品  
> 可并行压缩至 **22 周**（双后端）

---

### Phase 0：基线与资源（第 1–2 周）

**目标**：环境、密钥、Archive 基线冻结。

| 任务 | 产出 |
|------|------|
| 冻结 Archive commit，复制到 `services/agent-host/` | 目录就绪 |
| 申请 MiniMax + Ark key，写入 `.env`（不入库） | 密钥可用 |
| 本地 `docker compose up` 跑通 tesla-demo | smoke PASS |
| 服务器加 volume：`/data/memory-projects`, `/data/agent-runtime` | 磁盘规划 |
| 写 ADR：`docs/ADR_ARCHIVE_MIGRATION.md` | 决策记录 |
| 成本模型：单用户建档 + 100 轮对话 Token 估算 | 预算表 |

**验收命令**：
```bash
cd services/agent-host && docker compose build && docker compose up -d
curl -sS http://127.0.0.1:8787/health
npm run validate:static && npm run typecheck
```

---

### Phase 1：Agent Host 生产化（第 3–6 周）

**目标**：Archive 在 SoulMirror 环境独立稳定运行。

| 任务 | 细节 |
|------|------|
| Chart MCP 对齐 | L0 调用 `@soulmirror/chart` + `@soulmirror/bazi` 输出，写入 `chart_asset_id` JSON |
| 品牌与 prompt | Agent soul 改为 SoulMirror/心镜；去掉 Tesla demo 硬编码 |
| 中文 fixture | `tests/fixtures/zh-realistic-user-turns.mjs`（100 条，无架构术语） |
| 生产 Docker | 并入 `ecosystem.config.cjs` 或独立 compose；端口 8787 仅内网 |
| 监控脚本 | `scripts/diagnose-agent.sh`：health、analysis 路由、memory volume、key 配置 |
| ISSUE 修复清单 | 继承 Archive stage/09 全部 fixed 项；open-performance 列入 Phase 6 |

**验收**：
- Tesla/中文 segment 100 轮 `contract_errors = 0`
- `fuxi_node_done = 16`, `b09_initialized = false`

---

### Phase 2：NestJS 网关集成（第 7–10 周）

**目标**：正式用户可通过 API 域名使用 Agent，不暴露 8787。

| 任务 | 细节 |
|------|------|
| `AgentModule` | JWT 校验 → 生成 slug `u_{userId}` |
| WSS 代理 | `WS /v1/agent/stream?token=` → agent-host |
| HTTP 代理 | `POST /v1/agent/init`, `GET /v1/agent/init-status` |
| 建档钩子 | `PUT /chart/birth-profile` 成功后触发 L0 + Fuxi 16 init |
| MongoDB 索引 | `agent_init_status`, `agent_runs` collection |
| Nginx | `proxy_read_timeout 300s`；WSS Upgrade 头 |

**API 契约（新增）**：

```typescript
// POST /v1/agent/init — 手动重试初始化
// GET  /v1/agent/init-status → { phase, progress, fuxiNodesDone, error? }
// WS   /v1/agent/stream → { type: 'delta'|'done'|'background'|'error', ... }
// GET  /v1/memory/dashboard → 五轴摘要（读 Basic Memory index）
// GET  /v1/memory/pending → 待印证列表
// POST /v1/memory/confirm → { noteId, action: 'confirm'|'reject' }
```

**验收**：
- 生产域名 WSS 连通
- 新用户建档 → init-status 从 pending → running → done

---

### Phase 3：伏羲 16 节点 + L0 全链路（第 11–14 周）

**目标**：Archive 命盘地基完整可用。

| 任务 | 细节 |
|------|------|
| L0 硬前置 | 失败则 `fuxi_init_failed`，App 不可进入对话 |
| 16 节点并行 | `FUXI_INIT_CONCURRENCY=5`；进度事件推送到 WSS |
| calculation_profile | 引擎版本、时区、真太阳时、闰月 uncertainty |
| doctrine_profile | 子平/三合/四化/大限流年默认栈 |
| 按需节点路由 | 功曹 TRIGGER_FUXI → fuxi-nodes 50 节点中匹配 |
| 命盘轴 API | `GET /v1/memory/domain/ming` → L0–L3 生活语言摘要（术语 strip） |

**伏羲 16 节点清单**（与 Archive 一致）：

```
A01 本命总解 · A02 八字气候 · A03 紫微生命地图 · A04 一生命势 · A05 命盘机制卡
B06 全生命周期大运大限 · B07 当前十年深解 · B10 当前流年
C13 事业 · C16 财富 · C18 合作团队 · C19 学习认知 · C20 表达内容
C24 健康精力 · C25 福德内在 · D28 亲密关系
```

**验收**：
- 任意真实 birth-profile → 16 节点 Markdown 写入 `01_命/`
- B09 目录不存在

---

### Phase 4：菩萨 + 功曹 + 罗汉全链路（第 15–19 周）

**目标**：Archive 对话与记忆支线完整。

| 任务 | 细节 |
|------|------|
| 菩萨 WSS 流式 | 替换 bot/followup HTTP 主链 |
| Post-turn 异步 | 菩萨回复后立即返回；功曹后台 inbox 串行 |
| 功曹 6 种 action | NO_ACTION / LOG_ONLY / DISPATCH_LUOHAN / TRIGGER_FUXI / ASK_CLARIFICATION_LATER / MIXED |
| 四罗汉长期 session | 每用户每域一个 Claude Code session |
| multicast | 同一 envelope 可同时 dispatch 多个罗汉 |
| 原文策略 | `06_功曹/` 保留 user_text；罗汉 note 引用原文 |
| receipt loop | 罗汉 → 功曹 routing-memory 更新 |
| 退役 | `services/ai/followup.py` 主路径、`bot.service.ts` 主路径 |

**菩萨 Context Pack（内部，不对用户展示）**：

```markdown
当前问题 / 命盘参照 / 愿 / 境 / 缘 / 力 / 待印证 / 谨慎点
```

**验收**：
- 20 轮中文对话；第 21 轮菩萨引用第 5 轮用户原话
- 功曹 dispatch 有 JSONL 审计
- 罗汉 receipt `contract_errors = 0`

---

### Phase 5：移动端全量 IA（第 20–24 周）

**目标**：Guanxin UI 气质 + Archive 五轴结构。

#### 5.1 Tab 结构（终态）

| Tab | 映射 | 内容 |
|-----|------|------|
| **今天** | Today + 五轴入口 | 五轴总览卡片 + 当前话题 + 菩萨输入 |
| **话题** | 02_愿 + 03_境 | 话题网列表；详情：AI Summary + Key Evidence |
| **关系** | 04_缘 | 五类关系；阶段/事件；**无雷达评分** |
| **记忆** | 五域 + 06_功曹 | 待确认 / 最近记忆 / 隐私说明 |

#### 5.2 新增页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 五轴 Dashboard | `app/dashboard/axes.tsx` | 命/愿/境/缘/力 核心状态 |
| 轴详情 | `app/dashboard/axis/[domain].tsx` | L0–L3 分层 |
| 全屏对话 | `app/chat/[sessionId].tsx` | WSS 流式菩萨 |
| 待印证 | `app/memory/pending.tsx` | Confirm / Not sure |
| 跨轴事件 | `app/memory/event/[id].tsx` | 一事多轴关联 |
| 建档+初始化 | `app/chart/setup.tsx` | 进度条，非「生成报告」 |
| Init 等待 | `app/onboarding/init-progress.tsx` | 16 节点进度 |

#### 5.3 视觉规范

- 采用 **guanxin-ui 暖色 mindful** 风格（陶土 + 鼠尾草绿）
- 与现有 v4 紫色 tokens 做 **design token 迁移**（一次性切换）
- 禁止：进度环百分比、insights 计数、关系雷达图

#### 5.4 下线页面

- `onboarding/intent.tsx` 单次生成 → 改为进对话
- `report/followup/` → 合并到全屏 chat
- `/(tabs)/reports` 旧方案列表 → 改为伏羲报告索引（01_命）

**验收**：
- 5 个 Archive Demo Scope 结构均可导航
- 待印证 Confirm 后 note status 变 `active`

---

### Phase 6：性能、记忆治理、100 轮 E2E（第 25–27 周）

**目标**：解决 Archive ISSUE-019，生产级稳定。

| 任务 | 细节 |
|------|------|
| Active Index | 每域 `_network/index.md` + context pack |
| 记忆沉降 job | 每周合并重复 observation → `08_归档/` |
| 功曹 routing 压缩 | `routing-memory.md` 定期 compaction |
| 中文 100 轮 harness | `npm run test:live:zh100` |
| 性能目标 | 功曹 p95 < 30s（100 轮后） |
| 切流 | 关闭 `AGENT_MODE=legacy`；归档 `services/ai/` 主链 |
| 生产 7 天观察 | 错误率、延迟、memory volume 增长 |

**验收**：
- 100 轮中文 E2E PASS
- 生产无 P0

---

### Phase 7：产品化收尾（第 28 周+）

| 任务 | 内容 |
|------|------|
| PDF 导出 | 从伏羲报告 + 五轴摘要生成 |
| 家人跨 slug 授权 | 缘域合盘（D32/D33 按需） |
| 计费钩子 | 按 init / turn / fuxi 节点 |
| iOS TestFlight | WSS 长连接稳定性 |
| 文档 | 运维手册、成本监控、用户隐私说明更新 |

---

## 6. 工作包分解（按角色）

### 6.1 Agent 后端（主力，~60% 工时）

- [ ] Archive 迁入 `services/agent-host`
- [ ] Chart MCP ↔ soulmirror chart/bazi
- [ ] Claude Code Runner 生产 hardened
- [ ] 功曹 inbox + 罗汉 queue + Fuxi queue
- [ ] Basic Memory MCP role-scoped 写权限
- [ ] 中文 100 轮 fixture + harness
- [ ] Active index + 记忆沉降
- [ ] Docker + volume + pm2

### 6.2 NestJS 网关（~15% 工时）

- [ ] AgentModule + JWT WSS 代理
- [ ] init-status + memory dashboard API
- [ ] birth-profile → init 触发
- [ ] agent_runs MongoDB 索引
- [ ] 退役 analysis/bot 主链

### 6.3 移动端（~20% 工时）

- [ ] WSS client hook (`useBodhisattvaChat`)
- [ ] 4 Tab IA 重构
- [ ] 五轴 Dashboard + 轴详情
- [ ] 待印证流
- [ ] init 进度 UI
- [ ] design token 迁移（guanxin 暖色）
- [ ] eas.json + 生产 WSS URL

### 6.4 测试 / 产品（~5% 工时）

- [ ] 中文真实用户语料 100 条
- [ ] 100 轮 E2E 报告
- [ ] 术语 strip 抽检
- [ ] 儿童/伴侣报告人工审核流程

---

## 7. 基础设施清单

### 7.1 服务器（在现有 VPS 上扩展）

```text
soulmirror-api       127.0.0.1:3010   PM2
soulmirror-agent     127.0.0.1:8787   Docker 或 PM2
MongoDB              127.0.0.1:27017
/data/memory-projects                 volume（持续增长，需监控）
/data/agent-runtime                   volume
```

**建议规格**：8C16G+，100GB+ SSD（memory projects 随用户增长）

### 7.2 Nginx

```nginx
location /v1/agent/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
}
```

### 7.3 环境变量（生产 `.env` 模板）

```bash
# agent-host
PORT=8787
MEMORY_ROOT=/data/memory-projects
RUNTIME_ROOT=/data/agent-runtime
MINIMAX_API_KEY=sk-...
MINIMAX_ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
MINIMAX_ENABLED=1
ARK_API_KEY=ark-...
ARK_ANTHROPIC_BASE_URL=https://ark.cn-beijing.volces.com/api/plan
CLAUDE_MODEL_BODHISATTVA=MiniMax-M3
CLAUDE_MODEL_GONGCAO=MiniMax-M3
CLAUDE_MODEL_LUOHAN=MiniMax-M3
CLAUDE_MODEL_FUXI=deepseek-v4-pro
CLAUDE_FALLBACK_MODEL=ark-code-latest
FUXI_INIT_CONCURRENCY=5

# api
AGENT_HOST_URL=http://127.0.0.1:8787
AGENT_MODE=claude
```

---

## 8. 数据与迁移

| 数据 | 策略 |
|------|------|
| users, birth-profiles, relations | **保留** MongoDB |
| 旧 PlanReport (v4) | **只读**展示；新用户不再生成 |
| life_context | 迁移脚本 → Basic Memory 02愿/03境 初始 note |
| bot sessions | 归档只读；新对话走菩萨 WSS |
| v4 content library | 降级为伏羲节点补充素材，非主链 |

**迁移脚本**（Phase 2）：
```bash
scripts/migrate-life-context-to-memory.ts  # 一次性
```

---

## 9. 测试计划

### 9.1 自动化

| 测试 | 命令 | 频率 |
|------|------|------|
| 静态契约 | `npm run validate:static` | 每次 PR |
| 类型检查 | `npm run typecheck` | 每次 PR |
| Agent smoke | `curl health + analysis 422` | 部署后 |
| 中文 100 轮 | `npm run test:live:zh100` | 每 milestone |
| 术语 strip | `npm run test:terminology` | 每周 |

### 9.2 人工

- 每周抽检 10 份菩萨回复（生活语言、无术语）
- 儿童/伴侣相关 100% 人工审核（上线初期）
- 待印证流：Confirm/Reject 交互走查

---

## 10. 里程碑时间表

| 里程碑 | 周次 | 可演示 |
|--------|------|--------|
| **M0** 环境就绪 | W2 | docker tesla-demo PASS |
| **M1** Agent Host 生产化 | W6 | 中文 segment E2E |
| **M2** API 集成 | W10 | JWT + WSS + init-status |
| **M3** 伏羲 16 节点 | W14 | 真实用户建档 init |
| **M4** 全 Agent 链路 | W19 | 20 轮对话 + 记忆沉淀 |
| **M5** 移动端 IA | W24 | 五轴 + 待印证 + 对话 |
| **M6** 100 轮 + 切流 | W27 | 生产全量 Archive |
| **M7** 产品化 | W28+ | PDF / 计费 / iOS |

---

## 11. 成本估算（参考）

| 场景 | 调用量 | 粗算（人民币/月，10 活跃用户） |
|------|--------|--------------------------------|
| 新用户建档 | 16 伏羲节点 (Ark) | ¥50–200 / 人（一次性） |
| 日活对话 10 轮/人 | 10×(菩萨+功曹+2罗汉) MiniMax | ¥200–800 / 月 |
| 按需伏羲节点 | 偶尔 | ¥50–200 / 月 |
| **合计** | | **¥300–1200 / 月**（10 DAU，视对话深度） |

> 随用户增长线性上升；需上线 quotas 与计费。

---

## 12. 风险与对策

| 风险 | 等级 | 对策 |
|------|------|------|
| 周期 28 周偏长 | 中 | M2 后 mobile 可内测 WSS；并行双后端 |
| 成本超预期 | 高 | 功曹 NO_ACTION 比例监控；Fuxi 按需 |
| 功曹/罗汉 100s+ | 高 | Phase 6 active index 必做，不跳过 |
| Claude Code 版本 | 中 | pin 1.0.128；升级需 smoke |
| WSS 移动端不稳定 | 中 | 断线重连 + message id |
| 双轨数据分裂 | 中 | Basic Memory 唯一真源；Mongo 仅索引 |
| 100 轮 E2E 失败 | 中 | 分段修复；继承 Archive ISSUE 清单 |

---

## 13. 第一周行动清单（立即开始）

```text
□ 复制 Archive → services/agent-host/
□ 申请 MiniMax + Ark key，填入本地 .env
□ docker compose up 跑通 tesla-demo
□ 创建 docs/ADR_ARCHIVE_MIGRATION.md
□ API 新增 AgentModule 骨架 + GET /v1/agent/init-status 占位
□ 移动端 eas.json 增加 EXPO_PUBLIC_AGENT_WS_URL
□ 服务器创建 /data/memory-projects volume
□ 冻结 guanxin-ui 暖色为 design reference
```

---

## 14. 附录：Archive 能力对照表

| Archive 能力 | 本计划落点 | Phase |
|-------------|-----------|-------|
| L0 Chart Asset | Chart MCP + birth-profile 钩子 | 1, 3 |
| 伏羲 16 init | fuxi-initialize-16 + init-progress UI | 3 |
| 伏羲 50 按需 | 功曹 TRIGGER_FUXI | 4 |
| 菩萨即时回应 | WSS stream | 4 |
| 功曹 dispatch | post-turn inbox | 4 |
| 四罗汉记忆 | Basic Memory 02–05 | 4 |
| 原文 / 待印证 | Memory Tab Confirm | 5 |
| 五轴 Dashboard | dashboard/axes | 5 |
| 100 轮 E2E | test:live:zh100 | 6 |
| JSONL 审计 | agent-runtime volume | 1 |
| B09 不 init | 静态验证 + 测试 | 1 |
| 术语 strip | 命盘轴 API + 抽检 | 3, 6 |

---

## 15. 一句话

**在 v4 monorepo 中新建 `services/agent-host` 迁入 Archive 全栈，用 MiniMax + Ark 驱动 Claude Code 多 Agent，NestJS 做网关，移动端改为五轴 IA + 菩萨 WSS，28 周七阶段一次性达到 Archive 验证过的长期理解系统效果。**

---

*文档维护：每 milestone 结束更新验收状态。*
