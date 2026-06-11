#!/usr/bin/env bash
# Build locally, ship to ds9 (192.168.50.11) and (re)start the compose service.
# No sudo needed on the host: docker + the existing Traefik handle everything.
# Usage: ./scripts/deploy.sh
set -euo pipefail

HOST=piotrek@192.168.50.11
APP_DIR=/home/piotrek/srv/rpi-backup/private/plantdiary
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "==> Building backend (linux/amd64, static)"
cd "$REPO_ROOT/backend"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" \
  -o "$STAGE/bin/plantdiary-server" ./cmd/server/

echo "==> Building frontend"
cd "$REPO_ROOT/frontend"
npm run build
cp -R dist "$STAGE/frontend"

echo "==> Staging deploy files"
cp "$REPO_ROOT/deploy/Dockerfile" "$REPO_ROOT/deploy/docker-compose.yml" "$STAGE/"
mkdir -p "$STAGE/deploy"
cp "$REPO_ROOT"/deploy/* "$STAGE/deploy/" 2>/dev/null || true

echo "==> Syncing to $HOST:$APP_DIR"
ssh "$HOST" "mkdir -p $APP_DIR/data/uploads"
rsync -az --delete \
  --exclude data \
  --exclude .env \
  "$STAGE/" "$HOST:$APP_DIR/"

echo "==> Ensuring JWT secret exists (generated once, never overwritten)"
ssh "$HOST" "cd $APP_DIR && [ -f .env ] || echo \"JWT_SECRET=\$(head -c32 /dev/urandom | base64 | tr -d '=+/')\" > .env; chmod 600 .env"

echo "==> Building image and starting service"
ssh "$HOST" "cd $APP_DIR && docker compose build --quiet && docker compose up -d"

echo "==> Waiting for health"
for i in $(seq 1 20); do
  if ssh "$HOST" "curl -fsS -H 'Host: plantdiary.local' http://localhost/api/health" 2>/dev/null; then
    echo; echo "==> Deployed and healthy"
    exit 0
  fi
  sleep 2
done
echo "Health check did not pass; recent logs:"
ssh "$HOST" "cd $APP_DIR && docker compose logs --tail 50"
exit 1
