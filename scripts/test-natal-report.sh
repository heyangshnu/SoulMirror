#!/bin/bash
# 在服务器上测试紫微报告完整链路（需已注册用户）
# 用法：
#   bash scripts/test-natal-report.sh http://127.0.0.1:3010/v1 你的邮箱 你的密码
set -e

API="${1:?API 地址，如 http://127.0.0.1:3010/v1}"
EMAIL="${2:?邮箱}"
PASS="${3:?密码}"
API="${API%/}"

echo "==> 登录"
TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

echo "  Token: ${TOKEN:0:24}..."

echo ""
echo "==> 保存生辰"
curl -sf -X PUT "$API/chart/birth-profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate":"1995-06-15",
    "birthTime":"12:00",
    "gender":"female",
    "calendar":"solar",
    "birthPlace":"上海",
    "timeUnknown":false,
    "currentState":"测试状态",
    "focusDirection":"事业"
  }' | python3 -m json.tool

echo ""
echo "==> 生成本命报告（约 1～3 分钟，请耐心等待）"
START=$(date +%s)
REPORT=$(curl -sf -w "\nHTTP_CODE:%{http_code}" -X POST "$API/chart/reports/natal" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' --max-time 300)
END=$(date +%s)
HTTP=$(echo "$REPORT" | grep HTTP_CODE | cut -d: -f2)
BODY=$(echo "$REPORT" | sed '/HTTP_CODE:/d')

echo "  耗时 $((END - START)) 秒，HTTP $HTTP"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

REPORT_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('_id',''))" 2>/dev/null || true)
if [ -n "$REPORT_ID" ]; then
  echo ""
  echo "✅ 报告生成成功，ID: $REPORT_ID"
else
  echo ""
  echo "❌ 报告生成失败"
  exit 1
fi
