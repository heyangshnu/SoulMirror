# Archive 剩余工作 — 完成状态

> 对照「距 Archive 100% 工作清单」，代码侧实现状态（2026-05-28）。

## P0 · 必须先验

| # | 工作项 | 状态 |
|---|--------|------|
| P0-1 | Staging E2E E1–E10 | 脚本：`npm run archive:smoke`（需运行中 API/agent-host） |
| P0-2 | Live 100 轮 | `RUN_LIVE_TESLA100=1 npm run archive:validate`（需密钥） |
| P0-3 | Chart L0 单源 + longitude | ✅ API 注入 + `birthProfileToAgentPayload` 传经度 |
| P0-4 | 生产切流 | ✅ `.env.example` / `.env.production.example` → `AGENT_MODE=claude` |

## P1 · 产品体验

| # | 工作项 | 状态 |
|---|--------|------|
| P1-1 | `GET /v1/memory/current-topic` | ✅ |
| P1-2 | Today Tab（hero + guidance + 最近动态） | ✅ |
| P1-3 | Topics 搜索 + 状态筛选 | ✅ |
| P1-4 | Topic 详情多 Tab | ✅ |
| P1-5 | guanxin 组件库 | ✅ `components/guanxin/*` |
| P1-6 | WSS 断线重连 | ✅ `useBodhisattvaChat` 指数退避 |
| P1-7 | Legacy Tab 退役 | ✅ `useLegacyTabRedirect` + bot 410 |

## P2 · Phase 6 生产化

| # | 工作项 | 状态 |
|---|--------|------|
| P2-1 | Active Index | ✅ `maintenance.ts` + 24h 定时 |
| P2-2 | Context Pack | ⚠️ 模板已有；自动 pack job 为轻量版（index 维护） |
| P2-3 | routing-memory 压缩 | ✅ `compactGongcaoRouting` |
| P2-4 | 记忆沉降 | ✅ `sedimentDuplicateObservations` |
| P2-5 | 功曹 p95 | 需 live 100 轮后观测 |
| P2-6 | 退役 services/ai | 配置保留；`DEPLOY_LEGACY_AI=0` 运维切流 |

## P3 · 数据与 API

| # | 工作项 | 状态 |
|---|--------|------|
| P3-1 | life_context 迁移 | ✅ `npm run archive:migrate-life-context` |
| P3-2 | memory_index_cache | ✅ Mongo TTL 60s |
| P3-3 | 跨轴 events API | ✅ 读 `06_功曹/events.jsonl` + topicId |
| P3-4 | `GET /chart/relations/:id` | ✅ |
| P3-5 | dashboard 含 currentTopic | ✅ |

## P4 · 运维与 CI

| # | 工作项 | 状态 |
|---|--------|------|
| P4-1 | CI | ✅ `.github/workflows/validate-archive.yml` |
| P4-2 | Nginx WSS | 示例：`docs/nginx-soulmirror.conf.example` |
| P4-3 | 7 天生产观察 | 运维流程（非代码） |
| P4-4 | 运维手册 | ADR + ACCEPTANCE_CHECKLIST |

## P5 · Phase 7（未纳入本次代码范围）

PDF 导出、家人跨 slug、计费、TestFlight、Lora/水彩插画 — 需单独产品迭代。

---

**仍须在 staging 人工/自动验收：**

```bash
npm run archive:validate          # 静态 + build
npm run archive:smoke             # health + 可选 JWT
RUN_LIVE_TESLA100=1 npm run archive:validate
```

验收签字：________　日期：________
