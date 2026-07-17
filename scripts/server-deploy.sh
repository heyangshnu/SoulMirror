#!/bin/bash
# 云服务器部署 — API (PM2) + Agent Host (Docker) + 可选 legacy AI
set -e

APP_DIR="${APP_DIR:-/opt/soulmirror}"
cd "$APP_DIR"

echo "==> 拉取最新代码"
git pull origin main

echo "==> 安装依赖"
npm install

echo "==> 安装 agent-host 依赖（独立 package，不在 workspaces 内）"
npm run agent:install

echo "==> 构建 workspace 包 (types + chart + bazi)"
npm run packages:build

echo "==> 构建 API"
npm run api:build

echo "==> 构建 agent-host（宿主机；失败不阻断，生产以 Docker 镜像为准）"
if ! npm run agent:build; then
  echo "  ⚠️  宿主机 agent-host tsc 失败，继续用 Docker 构建镜像"
fi

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

# 生产 Nginx 反代 3010；避免默认/误配 PORT=3000 导致 EADDRINUSE 或探活端口不一致
if [ -f services/api/.env ]; then
  if grep -q '^PORT=' services/api/.env; then
    sed -i 's/^PORT=.*/PORT=3010/' services/api/.env
  else
    echo 'PORT=3010' >> services/api/.env
  fi
  echo "==> API PORT=$(grep -E '^PORT=' services/api/.env | cut -d= -f2 | tr -d ' ')"
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
[ -f services/api/.env ] && API_PORT=$(grep -E '^PORT=' services/api/.env | cut -d= -f2 | tr -d ' ' | tail -1)
[ -f services/ai/.env ] && AI_PORT=$(grep -E '^PORT=' services/ai/.env | cut -d= -f2 | tr -d ' ' | tail -1)

wait_http() {
  local url="$1"
  local name="$2"
  local attempts="${3:-20}"
  local i=1
  while [ "$i" -le "$attempts" ]; do
    if curl -sf "$url" >/dev/null; then
      echo "  ✅ ${name}"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

echo ""
echo "==> 部署后自检（等待服务就绪）"
if wait_http "http://127.0.0.1:${AGENT_PORT}/health" "Agent Host health (${AGENT_PORT})" 15; then
  :
else
  echo "  ❌ Agent Host 未响应 → docker logs soulmirror-agent"
fi
if wait_http "http://127.0.0.1:${API_PORT}/v1/agent/health" "API agent gateway (${API_PORT})" 30; then
  :
else
  echo "  ❌ API agent 未响应 → pm2 logs soulmirror-api --lines 80 --nostream"
  echo "     当前探测: http://127.0.0.1:${API_PORT}/v1/agent/health"
  ss -lntp 2>/dev/null | grep -E ":${API_PORT}|:3000" || true
fi
if [ "${DEPLOY_LEGACY_AI:-1}" = "1" ]; then
  if wait_http "http://127.0.0.1:${AI_PORT}/health" "AI health (${AI_PORT})" 10; then
    :
  else
    echo "  ⚠️  AI 未响应 (legacy 可选)"
  fi
fi

echo ""
echo "✅ 部署完成"
echo "验收：./scripts/diagnose-agent.sh"
echo "文档：docs/ACCEPTANCE_CHECKLIST.md"
