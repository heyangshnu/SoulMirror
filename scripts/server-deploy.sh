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

echo "==> 重启 PM2 进程"
pm2 delete soulmirror-api 2>/dev/null || true
pm2 delete soulmirror-ai 2>/dev/null || true

chmod +x services/ai/run-prod.sh
pm2 start ecosystem.config.cjs

pm2 save

API_PORT=3010
AI_PORT=8010
[ -f services/api/.env ] && API_PORT=$(grep -E '^PORT=' services/api/.env | cut -d= -f2 | tr -d ' ')
[ -f services/ai/.env ] && AI_PORT=$(grep -E '^PORT=' services/ai/.env | cut -d= -f2 | tr -d ' ')

echo ""
echo "✅ 后端部署完成"
echo "验证：curl http://127.0.0.1:${API_PORT}/v1/tests/catalog"
echo "验证：curl http://127.0.0.1:${AI_PORT}/health"
