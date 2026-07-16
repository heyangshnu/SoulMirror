#!/bin/bash
# 云服务器部署 — API (PM2) + Agent Host (Docker) + 可选 legacy AI
set -e

APP_DIR="${APP_DIR:-/opt/soulmirror}"
cd "$APP_DIR"

echo "==> 拉取最新代码"
git pull origin main

echo "==> 安装依赖"
npm install

echo "==> 构建 workspace 包 (types + chart + bazi)"
npm run packages:build

echo "==> 构建 API"
npm run api:build

echo "==> 构建 agent-host"
npm run agent:build

echo "==> Agent Host Docker（需已配置 services/agent-host/.env）"
if command -v docker >/dev/null 2>&1; then
  npm run agent:prod:up || echo "  ⚠️  agent docker 启动失败，请检查 services/agent-host/.env"
else
  echo "  ⚠️  docker 未安装，跳过 agent-host"
fi

AGENT_MODE="${AGENT_MODE:-claude}"
if [ -f services/api/.env ] && ! grep -q '^AGENT_MODE=' services/api/.env 2>/dev/null; then
  echo "AGENT_MODE=${AGENT_MODE}" >> services/api/.env
fi

if [ "${DEPLOY_LEGACY_AI:-1}" = "1" ]; then
  echo "==> 安装 AI 依赖 (legacy)"
  cd services/ai
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt -q
  deactivate
  cd ../..
fi

echo "==> 重启 PM2 进程"
pm2 delete soulmirror-api 2>/dev/null || true
if [ "${DEPLOY_LEGACY_AI:-1}" = "1" ]; then
  pm2 delete soulmirror-ai 2>/dev/null || true
fi

chmod +x services/ai/run-prod.sh 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

API_PORT=3010
AI_PORT=8010
AGENT_PORT=8787
[ -f services/api/.env ] && API_PORT=$(grep -E '^PORT=' services/api/.env | cut -d= -f2 | tr -d ' ')
[ -f services/ai/.env ] && AI_PORT=$(grep -E '^PORT=' services/ai/.env | cut -d= -f2 | tr -d ' ')

echo ""
echo "==> 部署后自检"
if curl -sf "http://127.0.0.1:${AGENT_PORT}/health" >/dev/null; then
  echo "  ✅ Agent Host health (${AGENT_PORT})"
else
  echo "  ❌ Agent Host 未响应 → docker logs soulmirror-agent"
fi
if curl -sf "http://127.0.0.1:${API_PORT}/v1/agent/health" >/dev/null; then
  echo "  ✅ API agent gateway (${API_PORT})"
else
  echo "  ❌ API agent 未响应 → pm2 logs soulmirror-api"
fi
if [ "${DEPLOY_LEGACY_AI:-1}" = "1" ]; then
  if curl -sf "http://127.0.0.1:${AI_PORT}/health" >/dev/null; then
    echo "  ✅ AI health (${AI_PORT})"
  else
    echo "  ⚠️  AI 未响应 (legacy 可选)"
  fi
fi

echo ""
echo "✅ 部署完成"
echo "验收：./scripts/diagnose-agent.sh"
echo "文档：docs/ACCEPTANCE_CHECKLIST.md"
