# ADR: Archive 多 Agent 架构迁入 SoulMirror v4

**状态**: 已采纳  
**日期**: 2026-05-28  
**决策者**: SoulMirror 工程组  

## 背景

SoulMirror v4 当前链路为 `Mobile → NestJS API → services/ai (Python)`，以单次报告与 bot 对话为主，缺乏 Archive（fate-and-fortune）验证过的：

- Basic Memory 五域长期记忆
- 菩萨 / 功曹 / 四罗汉 / 伏羲 多 Agent 编排
- 建档后 16 节点伏羲初始化
- Claude Code CLI + MCP 工具链

产品目标是在 **同一 monorepo** 内演进，而非新建仓库，并在 28 周内分 7 阶段完成全量迁移。

## 决策

### 1. 服务拓扑

| 组件 | 职责 | 部署 |
|------|------|------|
| `apps/mobile` | 4 Tab IA + WSS 菩萨对话 | EAS |
| `services/api` | JWT、建档、WSS 代理、Mongo 索引 | PM2 :3010 |
| `services/agent-host` | Archive 迁入：Host + MCP + Agents | Docker :8787 |
| `services/ai` | 遗留报告/PDF（Phase 6 退役） | PM2 :8010 |
| `/data/memory-projects` | Basic Memory Markdown 真源 | 宿主机 volume |
| `/data/agent-runtime` | Claude Code / basic-memory 运行时 | 宿主机 volume |

### 2. 模型与 Provider

| 角色 | 主模型 | 回退 |
|------|--------|------|
| 菩萨 / 功曹 / 四罗汉 | MiniMax M3（Anthropic 兼容端点） | Ark `ark-code-latest` |
| 伏羲 16 节点 | Volcano Ark `deepseek-v4-pro` | `ark-code-latest` |
| 推理运行时 | **Claude Code CLI**（容器内） | 非 Anthropic 官方 REST |

Cursor Pro 仅用于本地开发，**不能**替代生产模型 API。

### 3. 用户隔离与 slug

- 每个用户对应 Basic Memory 项目 slug：`u_{mongoUserId}`
- NestJS 校验 JWT 后生成 slug，WSS 代理至 `agent-host/ws?slug=...`
- 记忆真源在 Markdown；MongoDB 仅存 `agent_init_status`、`agent_runs`、`memory_index_cache` 等索引

### 4. 双轨迁移开关

```bash
AGENT_MODE=legacy   # 默认至 Phase 5：走 services/ai bot 链
AGENT_MODE=claude   # Phase 6 起默认：走 agent-host WSS
```

### 5. Chart 计算一致性

Phase 1 目标：`mcp/chart-server` 与 `@soulmirror/chart` / `@soulmirror/bazi` 输出 L0 JSON 一致。  
过渡期内 agent-host 自带 `chart-core.ts`（iztro + lunar-javascript），通过 `validate:chart` 与 NestJS 侧对照验收。

### 6. API 契约（NestJS 网关）

| 类型 | 路径 | 说明 |
|------|------|------|
| HTTP | `GET /v1/agent/init-status` | 伏羲 16 节点进度 |
| HTTP | `POST /v1/agent/init` | 手动重试初始化 |
| HTTP | `GET /v1/agent/health` | 代理 agent-host `/health` |
| WSS | `/v1/agent/stream?token=` | JWT → agent-host `/ws` |
| HTTP | `GET /v1/memory/*` | 五轴 dashboard（Phase 5） |

建档钩子：`PUT /v1/chart/birth-profile` 成功后异步触发 `AgentService.scheduleInit`。

## 备选方案（未采纳）

| 方案 | 原因 |
|------|------|
| 新建独立仓库 | 增加 CI/CD、类型包重复维护成本 |
| 直接用 Anthropic API 替代 Claude Code | Archive workflow 依赖 CLI + MCP 工具注册 |
| MongoDB 存记忆正文 | 违背 Basic Memory「Markdown 真源」原则 |
| 移动端直连 agent-host:8787 | 无法统一 JWT、无 Nginx 长连治理 |

## 后果

**正面**

- 与 Archive E2E（tesla 100 轮、biography 100）测试资产可直接复用
- NestJS 保持现有 auth/chart 能力，迁移风险可控
- Docker 隔离 Claude Code 与 Python AI，资源边界清晰

**负面 / 风险**

- 服务器需 Docker + 8C16G+ 建议配置
- WSS 长连接需 Nginx `proxy_read_timeout ≥ 300s`
- Phase 6 前需同时维护 ai 与 agent-host 两套链路

## 验收里程碑

| Sprint | 验收 |
|--------|------|
| 1–2 | agent-host health 200；ADR 评审；eas WS URL |
| 3–5 | Chart MCP L0 一致；`diagnose-agent.sh` |
| 6–8 | WSS 代理；init-status；建档钩子 |
| 9–11 | 16/16 伏羲 init；init-progress UI |
| 12–14 | 菩萨流式 + 功曹/罗汉链路 |
| 15–17 | guanxin 4 Tab + memory API |
| 18–19 | zh100 PASS；`AGENT_MODE=claude` 切流 |

## 参考

- [ARCHIVE_FULL_MIGRATION_PLAN.md](./ARCHIVE_FULL_MIGRATION_PLAN.md)
- [ARCHIVE_DEVELOPMENT_SCHEME.md](./ARCHIVE_DEVELOPMENT_SCHEME.md)
- `services/agent-host/README-SOULMIRROR.md`
