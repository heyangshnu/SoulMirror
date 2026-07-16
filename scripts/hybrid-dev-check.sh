#!/usr/bin/env bash
# Hybrid 本地四件套健康检查：Mongo + agent-host + API(claude) + AI
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_URL="${AGENT_HOST_URL:-http://127.0.0.1:8787}"
API_URL="${API_URL:-http://127.0.0.1:3000/v1}"
AI_URL="${AI_SERVICE_URL:-http://127.0.0.1:8001}"

pass=0
fail=0
warn=0

ok() { echo "  ✅ $1"; pass=$((pass + 1)); }
bad() { echo "  ❌ $1"; fail=$((fail + 1)); }
hint() { echo "  ⚠️  $1"; warn=$((warn + 1)); }

echo "==> SoulMirror Hybrid 本地检查"
echo "    agent-host  $AGENT_URL"
echo "    api         $API_URL"
echo "    ai          $AI_URL"
echo ""

echo "==> API .env（Hybrid 关键项）"
API_ENV="$ROOT/services/api/.env"
if [ -f "$API_ENV" ]; then
  grep -q '^AGENT_MODE=claude' "$API_ENV" && ok "AGENT_MODE=claude" || bad "缺少 AGENT_MODE=claude → 不会走 Hybrid，只会 legacy"
  grep -q '^AGENT_HOST_URL=' "$API_ENV" && ok "AGENT_HOST_URL 已配置" || bad "缺少 AGENT_HOST_URL"
  grep -q '^MEMORY_WRITE_SECRET=' "$API_ENV" && ok "MEMORY_WRITE_SECRET 已配置" || bad "缺少 MEMORY_WRITE_SECRET → bootstrap 写不进 memory"
  grep -q '^AI_SERVICE_URL=' "$API_ENV" && ok "AI_SERVICE_URL 已配置" || bad "缺少 AI_SERVICE_URL"
else
  bad "services/api/.env 不存在（cp .env.example .env）"
fi
echo ""

echo "==> agent-host .env"
AGENT_ENV="$ROOT/services/agent-host/.env"
if [ -f "$AGENT_ENV" ]; then
  grep -q '^FUXI_INIT_GATE=core' "$AGENT_ENV" && ok "FUXI_INIT_GATE=core" || hint "建议 FUXI_INIT_GATE=core（本地 Hybrid）"
  grep -q '^MEMORY_WRITE_SECRET=' "$AGENT_ENV" && ok "MEMORY_WRITE_SECRET 与 API 一致" || bad "agent-host 缺少 MEMORY_WRITE_SECRET"
  docker exec soulmirror-agent sh -c 'test -n "$ARK_API_KEY" && test -n "$MINIMAX_API_KEY"' 2>/dev/null \
    && ok "容器内 ARK + MiniMax 密钥" \
    || hint "容器密钥未加载 → docker compose up -d --force-recreate"
else
  bad "services/agent-host/.env 不存在"
fi
echo ""

echo "==> 服务连通"
curl -sf "$AGENT_URL/health" >/dev/null && ok "agent-host /health" || bad "agent-host 未运行 → npm run agent:up"
curl -sf "$API_URL/agent/health" >/dev/null && ok "API /agent/health" || bad "API 未运行 → npm run api"
curl -sf "$AI_URL/health" >/dev/null \
  && ok "AI 服务 ($AI_URL/health)" \
  || bad "AI 未运行 → npm run ai（v4 快轨不会生成，canChat 一直 false）"
pgrep -x mongod >/dev/null 2>&1 || docker ps --format '{{.Names}}' 2>/dev/null | grep -q mongo \
  && ok "MongoDB" \
  || hint "MongoDB 未检测到 → docker compose up -d mongodb"
echo ""

echo "==> 摘要"
echo "  通过 $pass  失败 $fail  警告 $warn"
if [ "$fail" -gt 0 ]; then
  echo ""
  echo "快速启动 Hybrid 四件套："
  echo "  npm run hybrid:stack    # Mongo + agent-host"
  echo "  npm run hybrid:services # API + AI（另开终端）"
  echo "  npm run hybrid:check    # 本脚本"
  exit 1
fi
echo ""
echo "Hybrid 栈就绪。App 建档后应在 1–3 分钟内 bootstrapReady + canChat。"
