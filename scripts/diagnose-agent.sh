#!/usr/bin/env bash
# SoulMirror agent-host 诊断脚本
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="${AGENT_DIR:-$ROOT/services/agent-host}"
AGENT_HOST_URL="${AGENT_HOST_URL:-http://127.0.0.1:8787}"
API_URL="${API_URL:-http://127.0.0.1:3010/v1}"

echo "==> SoulMirror Agent Host 诊断"
echo "    agent-host: $AGENT_HOST_URL"
echo "    api:        $API_URL"
echo ""

pass=0
fail=0

check() {
  local name="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "  ✅ $name"
    pass=$((pass + 1))
  else
    echo "  ❌ $name"
    fail=$((fail + 1))
  fi
}

echo "==> 目录与构建"
check "services/agent-host 存在" "[ -d '$AGENT_DIR' ]"
check "package.json 存在" "[ -f '$AGENT_DIR/package.json' ]"
check "Dockerfile 存在" "[ -f '$AGENT_DIR/Dockerfile' ]"
check "docker-compose.prod.yml 存在" "[ -f '$AGENT_DIR/docker-compose.prod.yml' ]"
check "dist 已构建或 node_modules 存在" "[ -d '$AGENT_DIR/dist' ] || [ -d '$AGENT_DIR/node_modules' ]"
echo ""

echo "==> Docker 容器"
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -qE 'soulmirror-agent|fate-and-fortune'; then
    echo "  ✅ agent 容器运行中"
    pass=$((pass + 1))
    docker ps --filter "name=soulmirror-agent" --filter "name=fate-and-fortune" --format "     {{.Names}}  {{.Status}}  {{.Ports}}" 2>/dev/null || true
  else
    echo "  ⚠️  agent 容器未运行（本地开发可用 npm run host）"
  fi
else
  echo "  ⚠️  docker 未安装"
fi
echo ""

echo "==> HTTP 健康"
HEALTH_JSON="$(curl -sf "$AGENT_HOST_URL/health" 2>/dev/null || true)"
if [ -n "$HEALTH_JSON" ]; then
  echo "  ✅ GET $AGENT_HOST_URL/health"
  pass=$((pass + 1))
  echo "$HEALTH_JSON" | head -c 400
  echo ""
else
  echo "  ❌ GET $AGENT_HOST_URL/health 无响应"
  fail=$((fail + 1))
  echo "     提示: cd services/agent-host && docker compose up -d --build"
  echo "     或:   npm run agent:host"
fi
echo ""

echo "==> NestJS Agent 网关"
AGENT_HEALTH="$(curl -sf "$API_URL/agent/health" 2>/dev/null || true)"
if [ -n "$AGENT_HEALTH" ]; then
  echo "  ✅ GET $API_URL/agent/health"
  pass=$((pass + 1))
else
  echo "  ⚠️  GET $API_URL/agent/health 无响应（API 未启或 AgentModule 未部署）"
fi
echo ""

echo "==> 持久化 volume（生产）"
for vol in /data/agent-runtime /data/memory-projects; do
  if [ -d "$vol" ]; then
    if [ -w "$vol" ]; then
      echo "  ✅ $vol 可写"
      pass=$((pass + 1))
    else
      echo "  ❌ $vol 存在但不可写"
      fail=$((fail + 1))
    fi
  else
    echo "  ⚠️  $vol 不存在（本地开发可忽略）"
  fi
done
echo ""

echo "==> 环境变量提示"
if [ -f "$AGENT_DIR/.env" ]; then
  if grep -qE '^MINIMAX_API_KEY=.+' "$AGENT_DIR/.env" 2>/dev/null; then
    echo "  ✅ MINIMAX_API_KEY 已配置"
  else
    echo "  ⚠️  MINIMAX_API_KEY 未配置"
  fi
  if grep -qE '^ARK_API_KEY=.+' "$AGENT_DIR/.env" 2>/dev/null; then
    echo "  ✅ ARK_API_KEY 已配置"
  else
    echo "  ⚠️  ARK_API_KEY 未配置"
  fi
else
  echo "  ⚠️  $AGENT_DIR/.env 不存在，请从 .env.example 复制"
fi
echo ""

echo "==> 汇总: ${pass} 通过, ${fail} 失败"
if [ "$fail" -gt 0 ]; then
  exit 1
fi
