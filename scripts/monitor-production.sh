#!/bin/bash
# 生产环境实时监控（SSH 登录服务器后使用）
# 用法：bash scripts/monitor-production.sh
set -e

APP_DIR="${APP_DIR:-/opt/soulmirror}"
cd "$APP_DIR" 2>/dev/null || cd "$(dirname "$0")/.."

echo "=========================================="
echo "  心镜生产监控 · $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

echo ""
echo "[进程状态]"
pm2 list 2>/dev/null || echo "  pm2 未运行"

echo ""
echo "[端口监听]"
ss -tlnp 2>/dev/null | grep -E ':3010|:8010|:443' || netstat -tlnp 2>/dev/null | grep -E ':3010|:8010' || true

echo ""
echo "[API 本机]"
curl -sf http://127.0.0.1:3010/v1/auth/config >/dev/null && echo "  ✅ API 3010" || echo "  ❌ API 3010"

echo ""
echo "[AI 本机]"
curl -sf http://127.0.0.1:8010/health >/dev/null && echo "  ✅ AI 8010" || echo "  ❌ AI 8010"

echo ""
echo "[公网 HTTPS]"
curl -sf https://api.soulzenai.com/v1/auth/config >/dev/null && echo "  ✅ https://api.soulzenai.com" || echo "  ❌ 公网 API"

echo ""
echo "[最近 API 错误 10 行]"
pm2 logs soulmirror-api --err --lines 10 --nostream 2>/dev/null | tail -10 || true

echo ""
echo "[最近 AI 日志 10 行]"
pm2 logs soulmirror-ai --lines 10 --nostream 2>/dev/null | tail -10 || true

echo ""
echo "=========================================="
echo "  实时跟踪（App 操作时另开终端运行）："
echo "    pm2 logs soulmirror-api --lines 0"
echo "    pm2 logs soulmirror-ai --lines 0"
echo "    tail -f /var/log/nginx/access.log"
echo "    tail -f /var/log/nginx/error.log"
echo "=========================================="
