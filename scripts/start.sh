#!/bin/bash
# Single-container entrypoint: applies migrations, then runs the web app and
# the DM worker side by side. Either process dying brings the container down
# so the orchestrator can restart it instead of silently losing the worker.

set -euo pipefail

npx prisma migrate deploy

npm run worker &
worker_pid=$!

npm run start &
web_pid=$!

trap 'kill -TERM "$worker_pid" "$web_pid" 2>/dev/null || true' TERM INT

wait -n "$worker_pid" "$web_pid"
exit_code=$?
kill -TERM "$worker_pid" "$web_pid" 2>/dev/null || true
exit "$exit_code"
