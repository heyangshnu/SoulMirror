#!/bin/bash
# 服务器上排查「生成报告失败」
# 用法：bash scripts/diagnose-reports.sh [API_BASE]
# 例：bash scripts/diagnose-reports.sh http://127.0.0.1:3010/v1
set -e

APP_DIR="${APP_DIR:-/opt/soulmirror}"
API="${1:-http://127.0.0.1:3010/v1}"
API="${API%/}"

cd "$APP_DIR" 2>/dev/null || cd "$(dirname "$0")/.."

API_PORT=$(echo "$API" | sed -n 's|.*:\([0-9]*\)/v1|\1|p')
API_PORT="${API_PORT:-3010}"
AI_PORT=8010
[ -f services/api/.env ] && AI_PORT=$(grep -E '^AI_SERVICE_URL=' services/api/.env | sed 's/.*:\([0-9]*\).*/\1/' || true)
[ -f services/ai/.env ] && AI_PORT=$(grep -E '^PORT=' services/ai/.env | cut -d= -f2 | tr -d ' ' || true)

echo "=========================================="
echo "  心镜 · 报告生成诊断"
echo "  API: $API"
echo "=========================================="

fail=0

echo ""
echo "[1] PM2 进程"
pm2 list 2>/dev/null || { echo "  ❌ pm2 未安装或未运行"; fail=1; }

echo ""
echo "[2] AI 健康检查"
if curl -sf "http://127.0.0.1:${AI_PORT}/health" >/dev/null; then
  echo "  ✅ http://127.0.0.1:${AI_PORT}/health"
else
  echo "  ❌ AI 未响应（${AI_PORT}）→ pm2 logs soulmirror-ai --lines 30"
  fail=1
fi

echo ""
echo "[3] API 健康检查"
if curl -sf "$API/tests/catalog" >/dev/null; then
  echo "  ✅ $API/tests/catalog"
else
  echo "  ❌ API 未响应 → pm2 logs soulmirror-api --lines 30"
  fail=1
fi

echo ""
echo "[4] chart 包是否已编译"
if [ -f packages/chart/dist/index.js ]; then
  echo "  ✅ packages/chart/dist/index.js"
else
  echo "  ❌ 缺少 chart 编译产物 → npm run chart:build"
  fail=1
fi

echo ""
echo "[5] DeepSeek 密钥"
if [ -f services/ai/.env ] && grep -qE '^DEEPSEEK_API_KEY=sk-' services/ai/.env; then
  echo "  ✅ DEEPSEEK_API_KEY 已配置"
else
  echo "  ⚠️  DEEPSEEK_API_KEY 未配置（将使用模板报告，仍应能成功）"
fi

echo ""
echo "[6] AI_SERVICE_URL"
if [ -f services/api/.env ]; then
  grep '^AI_SERVICE_URL=' services/api/.env || echo "  ⚠️  未设置，默认 localhost:8001"
else
  echo "  ❌ 缺少 services/api/.env"
  fail=1
fi

echo ""
echo "[7] 最近 API 错误（非 SMTP 535 可忽略邮件问题）"
pm2 logs soulmirror-api --err --lines 15 --nostream 2>/dev/null | tail -15 || true

echo ""
echo "[8] 最近 AI 日志"
pm2 logs soulmirror-ai --lines 15 --nostream 2>/dev/null | tail -15 || true

echo ""
echo "=========================================="
if [ "$fail" -eq 0 ]; then
  echo "  基础检查通过。若 App 仍失败，请在点击「生成」时另开终端："
  echo "    pm2 logs soulmirror-api --lines 0"
  echo "    pm2 logs soulmirror-ai --lines 0"
  echo ""
  echo "  并确认 Nginx proxy_read_timeout ≥ 300s（报告生成约 1～3 分钟）"
else
  echo "  ❌ 发现异常，请先修复上述项后 bash scripts/server-deploy.sh"
fi
echo "=========================================="
