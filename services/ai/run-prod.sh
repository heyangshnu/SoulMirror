#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH=.
set -a
[ -f .env ] && source .env
set +a
exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port "${PORT:-8010}"
