#!/usr/bin/env sh
set -eu

ulimit -c 0 || true

mkdir -p "${RUNTIME_ROOT:-/app/runtime}/claude-code"
mkdir -p "${RUNTIME_ROOT:-/app/runtime}/basic-memory"
mkdir -p "${RUNTIME_ROOT:-/app/runtime}/logs"
mkdir -p "${RUNTIME_ROOT:-/app/runtime}/home"
mkdir -p "${RUNTIME_ROOT:-/app/runtime}/tmp"
mkdir -p "${RUNTIME_ROOT:-/app/runtime}/cache/npm"
mkdir -p "${RUNTIME_ROOT:-/app/runtime}/cache/bun-install"
mkdir -p "${MEMORY_ROOT:-/app/memory-projects}"

if [ "$(id -u)" = "0" ]; then
  chown -R smqt:smqt "${RUNTIME_ROOT:-/app/runtime}" "${MEMORY_ROOT:-/app/memory-projects}"
  exec gosu smqt npm run start
fi

exec npm run start
