#!/usr/bin/env bash
# Usage: bash scripts/deploy.sh <env-name> <host-port> <image:tag>
# Deploys the container, waits for the Docker health check, rolls back on failure.
set -euo pipefail

ENV_NAME="$1"
PORT="$2"
IMAGE="$3"
NAME="app-${ENV_NAME}"

# Remember what is running now, so we can roll back
PREV_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$NAME" 2>/dev/null || true)

run_container() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" --restart unless-stopped \
    -p "${PORT}:3000" -e APP_ENV="${ENV_NAME}" "$1" >/dev/null
}

wait_healthy() {
  for i in $(seq 1 20); do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$NAME" 2>/dev/null || echo "none")
    echo "Health check ${i}/20: ${status}"
    [ "$status" = "healthy" ] && return 0
    sleep 3
  done
  return 1
}

echo "Deploying ${IMAGE} to ${ENV_NAME} on port ${PORT} (previous: ${PREV_IMAGE:-none})"
run_container "$IMAGE"

if wait_healthy; then
  echo "Deployment successful."
  exit 0
fi

echo "Deployment FAILED health check."
if [ -n "$PREV_IMAGE" ]; then
  echo "Rolling back to ${PREV_IMAGE}"
  run_container "$PREV_IMAGE"
else
  docker rm -f "$NAME" >/dev/null 2>&1 || true
fi
exit 1
