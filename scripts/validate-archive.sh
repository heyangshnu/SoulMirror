#!/usr/bin/env bash
# Archive 验收脚本：静态校验 + 可选 live 测试
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> packages:build"
npm run packages:build

echo "==> agent-host build"
npm run agent:build

echo "==> validate:static"
npm run agent:validate:static

echo "==> api build"
npm run api:build

if [ "${RUN_LIVE_TESLA100:-0}" = "1" ]; then
  echo "==> test:live:tesla100 (需要 MiniMax + Ark 密钥)"
  npm run agent:test:live:tesla100
else
  echo "==> 跳过 live 测试（设置 RUN_LIVE_TESLA100=1 启用）"
fi

echo "✅ Archive 验收脚本完成"
