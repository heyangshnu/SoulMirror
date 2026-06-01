#!/bin/bash
# 生产环境验收脚本（打 Android 包前必须全部通过）
# 用法：bash scripts/verify-production.sh https://api.soulmirror.cn/v1
set -e

API="${1:?请传入 API 地址，例如: bash scripts/verify-production.sh https://api.soulmirror.cn/v1}"
API="${API%/}"

echo "=========================================="
echo "  心镜生产环境验收"
echo "  API: $API"
echo "=========================================="

echo ""
echo "[1/5] 测试目录..."
curl -sf "$API/tests/catalog" >/dev/null && echo "  ✅ 通过" || { echo "  ❌ 失败"; exit 1; }

echo ""
echo "[2/5] 发送验证码..."
curl -sf -X POST "$API/auth/sms/send" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000"}' >/dev/null && echo "  ✅ 通过" || { echo "  ❌ 失败"; exit 1; }

echo ""
echo "[3/5] 登录..."
RESP=$(curl -sf -X POST "$API/auth/sms/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}')
TOKEN=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
if [ -z "$TOKEN" ]; then echo "  ❌ 登录失败"; exit 1; fi
echo "  ✅ 通过 (Token: ${TOKEN:0:20}...)"

echo ""
echo "[4/5] 塔罗测试（需 AI 服务）..."
curl -sf -X POST "$API/tests/tarot/draw" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"general","seed":1}' >/dev/null && echo "  ✅ 通过" || { echo "  ❌ 失败（检查 AI 服务）"; exit 1; }

echo ""
echo "[5/5] 报告列表..."
curl -sf "$API/reports" -H "Authorization: Bearer $TOKEN" >/dev/null && echo "  ✅ 通过" || { echo "  ❌ 失败"; exit 1; }

echo ""
echo "=========================================="
echo "  🎉 全部通过！可以打 Android 包了"
echo "=========================================="
echo ""
echo "下一步："
echo "  1. 修改 apps/mobile/eas.json 里的 EXPO_PUBLIC_API_URL"
echo "  2. cd apps/mobile && eas build -p android --profile preview"
