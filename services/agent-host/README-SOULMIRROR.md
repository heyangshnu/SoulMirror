# SoulMirror Agent Host

Archive（fate-and-fortune）多 Agent 运行时，迁入 SoulMirror monorepo 的 `services/agent-host`。

## 架构角色

```
Mobile WSS ──► NestJS /v1/agent/stream ──► agent-host :8787/ws
NestJS HTTP ──► agent-host /health, /api/{slug}/status
建档 API ──► NestJS AgentService.scheduleInit ──► WS start 消息
```

- **slug 规范**: `u_{mongoUserId}`
- **记忆真源**: `/data/memory-projects/{slug}/`（Basic Memory Markdown）
- **运行时**: `/data/agent-runtime/`（Claude Code、basic-memory 缓存）

## 本地开发

```bash
cd services/agent-host
cp .env.example .env
# 填入 MINIMAX_API_KEY、ARK_API_KEY

npm install
npm run build
npm run host          # 开发：tsx 直接跑，默认 :8787

# 或 Docker 本地 smoke
docker compose up -d --build
curl -s http://127.0.0.1:8787/health | jq .
```

## 生产部署

```bash
cd services/agent-host
cp .env.production.example .env
# 编辑密钥与 volume 路径

sudo mkdir -p /data/agent-runtime /data/memory-projects
sudo chown -R $(whoami) /data/agent-runtime /data/memory-projects

docker compose -f docker-compose.prod.yml up -d --build
```

从 monorepo 根目录：

```bash
npm run agent:prod:up
npm run agent:health
```

## 健康检查与诊断

```bash
# monorepo 根目录
./scripts/diagnose-agent.sh

# 容器内 live 测试（需有效 API Key）
cd services/agent-host
npm run test:live:tesla100
```

## MCP 服务

| 脚本 | 说明 |
|------|------|
| `npm run mcp:chart` | L0 排盘 MCP（Phase 1 对齐 @soulmirror/chart） |
| `npm run mcp:memory` | Basic Memory 读写 |
| `npm run mcp:methodology` | 方法论检索 |

## 与 NestJS 集成

`services/api/.env`:

```bash
AGENT_HOST_URL=http://127.0.0.1:8787
AGENT_MODE=legacy          # legacy | claude
```

移动端 `eas.json`:

```bash
EXPO_PUBLIC_AGENT_WS_URL=wss://api.soulzenai.com/v1/agent/stream
```

## 参考文档

- [docs/ADR_ARCHIVE_MIGRATION.md](../../docs/ADR_ARCHIVE_MIGRATION.md)
- [docs/ARCHIVE_DEVELOPMENT_SCHEME.md](../../docs/ARCHIVE_DEVELOPMENT_SCHEME.md)
- `docs/GONGCAO_ROUTING.md`、`docs/BODHISATTVA_ENGINE.md`（本目录内）
