#!/bin/bash
# 云服务器上拉代码并部署后端（API + AI + MongoDB）
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
pip install -r requirements.txt
deactivate
cd ../..

echo "==> 启动 MongoDB（Docker）"
npm run docker:up

echo "==> 重启 PM2 进程"
pm2 delete soulmirror-api 2>/dev/null || true
pm2 delete soulmirror-ai 2>/dev/null || true

pm2 start services/api/dist/main.js --name soulmirror-api
pm2 start "services/ai/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001" \
  --name soulmirror-ai \
  --cwd services/ai \
  --interpreter none

pm2 save

echo ""
echo "✅ 后端部署完成"
echo "验证：curl http://127.0.0.1:3000/v1/tests/catalog"
echo "验证：curl http://127.0.0.1:8001/health"
