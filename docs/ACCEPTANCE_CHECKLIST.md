# SoulMirror Archive 迁移 — 统一验收清单

> 完成 Sprint 1–19 全量开发后，按本清单一次性验收。  
> 前置：服务器已配置 MiniMax + Ark 密钥，`AGENT_MODE=claude`，agent-host Docker 运行中。

## 零-b、Hybrid 本地四件套（开发）

```bash
npm run hybrid:stack      # Mongo + agent-host（Docker）
npm run hybrid:services   # API + AI（另开终端，或配合 hybrid:dev）
npm run hybrid:check      # 验证 AGENT_MODE / AI / 密钥 / 健康
npm run mobile            # Expo
```

**常见「像旧 Archive」原因**：API 缺 `AGENT_MODE=claude`、AI 未起、`MEMORY_WRITE_SECRET` 不一致。

## 零、静态验收（本地 / CI）

```bash
./scripts/validate-archive.sh
# 可选 live 100 轮（需密钥）：
RUN_LIVE_TESLA100=1 ./scripts/validate-archive.sh
```

等价 monorepo 命令：

| 命令 | 说明 |
|------|------|
| `npm run agent:validate:static` | agent-host 静态校验 |
| `npm run agent:test:live:tesla100` | Tesla100 live 段测试 |
| `npm run packages:build && npm run agent:build && npm run api:build` | 全链构建 |

## 一、基础设施

| # | 检查项 | 命令 / 期望 |
|---|--------|-------------|
| I1 | agent-host 健康 | `curl http://127.0.0.1:8787/health` → `ok: true` |
| I2 | API agent 网关 | `curl http://127.0.0.1:3010/v1/agent/health` |
| I3 | 持久化 volume | `/data/agent-runtime`、`/data/memory-projects` 可写 |
| I4 | 诊断脚本 | `./scripts/diagnose-agent.sh` 无失败项 |
| I5 | Nginx WSS | `proxy_read_timeout ≥ 300s`（见 `docs/nginx-soulmirror.conf.example`） |

## 二-b、Hybrid 验收（v4 快轨 + Archive 慢轨）

| # | 检查项 | 命令 / 期望 |
|---|--------|-------------|
| H1 | v4 快轨 | 建档后 `GET /v1/reports` 含 `self_profile` + `recent_years` |
| H2 | 记忆写入 | `docker exec soulmirror-agent cat /app/memory-projects/u_*/01_命/_bootstrap_plan.md` 存在 |
| H3 | 可聊门控 | `GET /v1/agent/init-status` → `bootstrapReady: true` 时 `canChat: true`（不必等 16/16） |
| H4 | core gate | agent-host `FUXI_INIT_GATE=core`；A01–A05 后 `fuxi_init_chat_ready` |
| H5 | Today 切换 | 伏羲 A 系列 ≥3 后，Today 优先展示命域报告而非 v4 卡片 |
| H6 | Live 100 严格模式 | 跑前设 `FUXI_INIT_GATE=full` |

```bash
# 本地 Hybrid 烟雾（需 API + agent-host + services/ai 运行）
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3010/v1/agent/init-status | jq '{canChat,bootstrapReady,phase,fuxiNodesDone}'
```

## 二、端到端场景（E1–E12）

| # | 场景 | 步骤 | 期望 |
|---|------|------|------|
| E1 | 新用户建档（Hybrid） | 注册 → 出生信息 → **Today**（非 init 全屏阻塞） | 1–3 分钟内出现「底色/近几年」卡片；`bootstrapReady` + `canChat: true` |
| E1b | 后台深度 init | 建档后观察 init-status | `fuxiNodesDone` 递增；≥3 个 A 系列后 Today 显示命域报告 |
| E1c | 首次对话（Hybrid） | Today 底栏 → chat（bootstrap 后） | 收到流式 delta；agent-host 可读 `01_命/_bootstrap_plan.md` |
| E2 | 首次对话 | Today 底栏 → chat → 发消息 | 收到流式 delta + `done` |
| E3 | 记忆沉淀 | 对话 3 轮 → Memory Tab | 有待确认项（若功曹已写入 pending） |
| E4 | 确认记忆 | Memory → Confirm | 状态变 active |
| E5 | 拒绝记忆 | Not sure | 不进入 active |
| E6 | 话题可见 | Topics Tab | 列表有 Active 项 + 命域报告入口 |
| E7 | 关系 | Relations Tab → 详情 | 关系人列表，无雷达/评分 |
| E8 | 五轴 | Today → 五轴 / dashboard/axes → axis/[domain] | 五轴摘要为生活语言 |
| E9 | 跨轴 | memory/event/[id]（可选） | 多轴关联摘要 |
| E10 | 术语 | 抽检 ming/reports 输出 | 无禁词（API strip） |
| E11 | 100 轮 | `RUN_LIVE_TESLA100=1 ./scripts/validate-archive.sh` | segment PASS |
| E12 | 重启 | `docker restart soulmirror-agent` | 记忆目录仍在 |

## 三、前端 IA（4 Tab + guanxin）

| Tab | 路由 | 必达 |
|-----|------|------|
| 今天 | `(tabs)/today` | hero 五轴 + 底栏输入 → chat |
| 话题 | `(tabs)/topics` | 卡片列表 + 命域报告，无进度环 |
| 关系 | `(tabs)/relations` | 列表 + 管理入口 → relation/[id] |
| 记忆 | `(tabs)/memory` | Pending confirm / reject → memory/item/[id] |
| 我的 | `(tabs)/profile` | 账号、出生信息 |

| 页面 | 路由 |
|------|------|
| 菩萨对话 | `/chat` |
| 建档 | `/chart/setup`（legacy 模式不跳 init-progress） |
| 初始化 | `/onboarding/init-progress` |
| 五轴 Dashboard | `/dashboard/axes`、`/dashboard/axis/[domain]` |
| 话题详情 | `/topic/[id]`（含 Evidence） |
| 命域报告 | `/ming/report/[code]` |
| 记忆详情 | `/memory/item/[id]` |
| 跨轴事件 | `/memory/event/[id]` |
| 关系详情 | `/relation/[id]` |

**Claude 模式退役入口**：`bot`、`followup/ask`、`intent` 重定向至 `/chat`；`(tabs)/mirror` 自动跳转 chat。

视觉：陶土色 `#B85C38` 主色，暖白底 `#FDFBF9`（见 `theme/tokens.ts`）。

## 四、API 契约

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/agent/init-status` | JWT，16 节点进度 |
| POST | `/v1/agent/init` | 手动重试 |
| GET | `/v1/agent/transcript` | 会话 transcript |
| WS | `/v1/agent/stream?token=` | 归一化 delta/done/init_progress |
| GET | `/v1/memory/dashboard` | 五轴摘要 |
| GET | `/v1/memory/domain/:domain` | 单轴详情 |
| GET | `/v1/memory/pending` | 待印证 |
| POST | `/v1/memory/confirm` | confirm / reject |
| GET | `/v1/memory/topics` | 话题列表 |
| GET | `/v1/memory/topics/:id` | 话题/记忆详情 + evidence |
| GET | `/v1/memory/events/:id` | 跨轴关联 |
| GET | `/v1/ming/reports` | 伏羲报告列表 |
| GET | `/v1/ming/reports/:code` | 报告正文（strip 后） |

**Legacy 410**：`AGENT_MODE=claude` 时 `POST /bot/*`、`POST /analysis/followup/ask` 返回 410。

## 五、切流与退役

1. 生产 `services/api/.env`：`AGENT_MODE=claude`
2. 观察 7 天无 P0 后，可选 `DEPLOY_LEGACY_AI=0 ./scripts/server-deploy.sh` 停 soulmirror-ai
3. PDF 导出仍可走 legacy ai 直至 Phase 7

## 六、已知限制（验收时知晓即可）

- agent-host 独立 Web UI 仍用本地 chart-core；经 API 建档/init 时 Chart L0 由 `@soulmirror/chart` 注入
- 跨轴事件 API 为轻量聚合，依赖话题 Markdown 实际写入
- Tesla100 live 测试需 MiniMax + Ark 密钥，默认静态验收跳过

---

验收签字：________　日期：________
