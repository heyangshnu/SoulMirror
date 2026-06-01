#!/bin/bash
# 云服务器部署（无 Docker 版，适配已有 MongoDB + 多应用共存）
set -e

APP_DIR="${APP_DIR:-/opt/soulmirror}"
cd "$APP_DIR"

echo "==> 拉取最新代码"
git pull origin main

echo "==> 安装依赖"
npm install
cd packages/shared-types && npm run build && cd ../..

echo "==> 构建 API"
npm run api:build

echo "==> 安装 AI 依赖"
cd services/ai
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -q
deactivate
cd ../..

# 从 .env 读取 AI 端口，默认 8010
AI_PORT=8010
if [ -f services/ai/.env ]; then
  AI_PORT=$(grep -E '^PORT=' services/ai/.env | cut -d= -f2 | tr -d ' ')
  AI_PORT=${AI_PORT:-8010}
fi

API_PORT=3010
if [ -f services/api/.env ]; then
  API_PORT=$(grep -E '^PORT=' services/api/.env | cut -d= -f2 | tr -d ' ')
  API_PORT=${API_PORT:-3010}
fi

echo "==> 重启 PM2 进程 (API:$API_PORT AI:$AI_PORT)"
pm2 delete soulmirror-api 2>/dev/null || true
pm2 delete soulmirror-ai 2>/dev/null || true

pm2 start services/api/dist/main.js --name soulmirror-api
pm2 start "services/ai/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port $AI_PORT" \
  --name soulmirror-ai \
  --cwd "$APP_DIR/services/ai" \
  --interpreter none

pm2 save

echo ""
echo "✅ 后端部署完成"
echo "验证：curl http://127.0.0.1:$API_PORT/v1/tests/catalog"
echo "验证：curl http://127.0.0.1:$AI_PORT/health"
