#!/usr/bin/env bash
# 本地一键冒烟验证（需 Mongo + AI + API 已启动）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_BASE:-http://localhost:3000/v1}"
AI="${AI_BASE:-http://localhost:8001}"

echo "== 1. 健康检查 =="
curl -sf "$AI/health" | python3 -m json.tool
curl -sf "$API/tests/catalog" | python3 -c "import sys,json; d=json.load(sys.stdin); print('catalog items:', len(d.get('items',[])))"

echo "== 2. 注册/登录（邮箱 dev 模式） =="
EMAIL="verify-$(date +%s)@local.test"
PASS="Test1234!"

SEND=$(curl -sf -X POST "$API/auth/send-register-code" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\"}")
echo "$SEND" | python3 -m json.tool
CODE=$(echo "$SEND" | python3 -c "import sys,json; print(json.load(sys.stdin).get('dev_code',''))")
if [ -z "$CODE" ]; then
  echo "ERROR: 未拿到 dev_code，请确认 EMAIL_DEV_MODE=true 且 API 已启动"; exit 1
fi

REG=$(curl -sf -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"verification_code\":\"$CODE\",\"terms_accepted\":true,\"terms_version\":\"1.0\"}")
echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print('register ok, user:', d.get('user',{}).get('nickname','?'))"

TOKEN=$(echo "$REG" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))")
if [ -z "$TOKEN" ]; then
  echo "ERROR: 注册后未拿到 accessToken"; exit 1
fi
echo "Token OK"
AUTH="Authorization: Bearer $TOKEN"

echo "== 3. 紫微建档 =="
curl -sf -X PUT "$API/chart/birth-profile" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"birthDate":"1995-06-15","birthTime":"10:30","gender":"female","calendar":"solar","birthPlace":"上海","timeUnknown":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('soul:', d.get('natal',{}).get('soul','?'), 'warning:', d.get('warning'))"

echo "== 4. 大限流年 =="
curl -sf "$API/chart/horoscope?year=2026" -H "$AUTH" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('age:', d.get('currentAge'), 'decadal:', d.get('decadal',{}).get('range'), 'yearly:', d.get('yearly',{}).get('palace'))"

echo "== 5. 本命报告（DeepSeek，约 10-30s） =="
REPORT=$(curl -sf -X POST "$API/chart/reports/natal" -H "$AUTH" -H 'Content-Type: application/json' -d '{}')
echo "$REPORT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('report:', d.get('title'), '| theme:', d.get('themeLabel'), '| sections:', len(d.get('sections',[])))"

echo "== 5b. 大限 / 流年报告 =="
curl -sf -X POST "$API/chart/reports/daxian" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('daxian:', d.get('title'))"
curl -sf -X POST "$API/chart/reports/liunian" -H "$AUTH" -H 'Content-Type: application/json' -d '{"year":2026}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('liunian:', d.get('title'))"

echo "== 6. 关系人 =="
REL=$(curl -sf -X POST "$API/chart/relations" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"relationType":"spouse","name":"测试","birthDate":"1993-01-01","birthTime":"08:00","gender":"male"}')
REL_ID=$(echo "$REL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('_id',''))")
echo "relation id: $REL_ID"

echo "== 7. 语音日记 + 聊天摘要 =="
curl -sf -X POST "$API/chart/voice-diary" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"text":"今天心情平静，想专注沟通"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('diary entries:', len(d.get('voiceDiaryEntries',[])))"
curl -sf -X POST "$API/chart/chat-summary" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('chat summary:', (d.get('summary') or '')[:60])"

echo "== 8. 心镜对话（含 chart_context） =="
SESSION=$(curl -sf -X POST "$API/bot/sessions" -H "$AUTH" -H 'Content-Type: application/json' -d '{}')
SID=$(echo "$SESSION" | python3 -c "import sys,json; print(json.load(sys.stdin).get('_id',''))")
REPLY=$(curl -sf -X POST "$API/bot/sessions/$SID/messages" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"message":"根据我的命盘，给我一句今日觉察"}')
echo "$REPLY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('bot reply:', (d.get('reply') or '')[:120])"

echo ""
echo "== 全部通过 =="
echo "App: cd apps/mobile && npx expo start --localhost"
