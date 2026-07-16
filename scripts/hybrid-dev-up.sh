#!/usr/bin/env bash
# 启动 Hybrid 本地依赖：MongoDB + agent-host（API/AI 用 concurrently 另起）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> 1/3 MongoDB"
docker compose up -d mongodb

echo "==> 2/3 agent-host（重建以加载 Hybrid 代码）"
docker compose -f services/agent-host/docker-compose.yml up -d --build --force-recreate

echo "==> 3/3 等待 agent-host"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8787/health >/dev/null 2>&1; then
    echo "    agent-host ready"
    break
  fi
  sleep 2
done

echo ""
echo "下一步（新终端）："
echo "  npm run hybrid:services   # 同时起 API + AI"
echo "  npm run mobile            # Expo"
echo "  npm run hybrid:check      # 验证四件套"
echo ""
bash scripts/hybrid-dev-check.sh || true
