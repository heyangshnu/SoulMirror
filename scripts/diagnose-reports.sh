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
echo "[2b] AI 报告路由（v4 analysis）"
ANALYSIS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "http://127.0.0.1:${AI_PORT}/analysis/recent-years" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "000")
if [ "$ANALYSIS_CODE" = "404" ] || [ "$ANALYSIS_CODE" = "000" ]; then
  echo "  ❌ POST /analysis/recent-years → ${ANALYSIS_CODE}（AI 代码过旧或未重启）"
  echo "     修复：fuser -k ${AI_PORT}/tcp 2>/dev/null; pm2 restart soulmirror-ai"
  echo "     或：pm2 delete soulmirror-ai && pm2 start ecosystem.config.cjs --only soulmirror-ai"
  fail=1
elif [ "$ANALYSIS_CODE" = "422" ] || [ "$ANALYSIS_CODE" = "200" ]; then
  echo "  ✅ POST /analysis/recent-years → ${ANALYSIS_CODE}（路由存在）"
else
  echo "  ⚠️  POST /analysis/recent-years → ${ANALYSIS_CODE}"
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
echo "[4] workspace 包是否已编译"
for pkg in shared-types chart bazi; do
  if [ -f "packages/${pkg}/dist/index.js" ]; then
    echo "  ✅ packages/${pkg}/dist/index.js"
  else
    echo "  ❌ 缺少 packages/${pkg} → npm run packages:build"
    fail=1
  fi
done

echo ""
echo "[5] DeepSeek 密钥"
if [ -f services/ai/.env ] && grep -qE '^DEEPSEEK_API_KEY=sk-' services/ai/.env; then
  echo "  ✅ DEEPSEEK_API_KEY 已配置"
else
  echo "  ⚠️  DEEPSEEK_API_KEY 未配置（将使用模板报告，仍应能成功）"
fi

echo ""
echo "[6] AI_SERVICE_URL 与 AI 端口"
if [ -f services/api/.env ]; then
  AI_URL=$(grep '^AI_SERVICE_URL=' services/api/.env | cut -d= -f2- | tr -d ' ')
  echo "  AI_SERVICE_URL=$AI_URL"
  if echo "$AI_URL" | grep -q ":8010"; then
    echo "  ✅ 端口 8010（生产默认）"
  elif echo "$AI_URL" | grep -q ":8001"; then
    echo "  ⚠️  仍是 8001，生产应改为 http://127.0.0.1:8010"
    fail=1
  else
    echo "  ⚠️  请确认与 services/ai/.env 中 PORT 一致"
  fi
else
  echo "  ❌ 缺少 services/api/.env"
  fail=1
fi

echo ""
echo "[7] v4 内容库"
if [ -f services/ai/content/manifest.json ]; then
  python3 - <<'PY' 2>/dev/null || true
import json
from pathlib import Path
m = json.loads(Path("services/ai/content/manifest.json").read_text())
print(f"  ✅ manifest: zh={m.get('zh_entries','?')} en={m.get('en_entries','?')}")
PY
else
  echo "  ⚠️  缺少 manifest → python3 scripts/import_v4_content.py"
fi

echo ""
echo "[8] 最近 API 错误（非 SMTP 535 可忽略邮件问题）"
pm2 logs soulmirror-api --err --lines 15 --nostream 2>/dev/null | tail -15 || true

echo ""
echo "[9] 最近 AI 日志"
pm2 logs soulmirror-ai --lines 15 --nostream 2>/dev/null | tail -15 || true

echo ""
echo "=========================================="
if [ "$fail" -eq 0 ]; then
  echo "  基础检查通过。若 App 仍失败，请在点击「生成」时另开终端："
  echo "    pm2 logs soulmirror-api --lines 0    # 优先看这个（AI 无日志说明请求未到 AI）"
  echo "    pm2 logs soulmirror-ai --lines 0"
  echo ""
  echo "  并确认 Nginx proxy_read_timeout ≥ 300s（报告生成约 1～3 分钟）"
else
  echo "  ❌ 发现异常，请先修复上述项后 bash scripts/server-deploy.sh"
fi
echo "=========================================="
