#!/usr/bin/env bash
# Manual deployment steps for the original nginx + systemd path.
# Requires sudo on the target host — the automated deployment on ds9 uses
# docker compose + the existing Traefik instead (see scripts/deploy.sh).
set -euo pipefail

APP_DIR=/home/piotrek/srv/rpi-backup/private/plantdiary

echo "1. Install the systemd unit"
sudo cp "$APP_DIR/deploy/plantdiary.service" /etc/systemd/system/plantdiary.service
sudo systemctl daemon-reload
sudo systemctl enable plantdiary
sudo systemctl start plantdiary

echo "2. Install nginx vhost"
sudo apt-get install -y nginx
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/plantdiary
sudo ln -sf /etc/nginx/sites-available/plantdiary /etc/nginx/sites-enabled/plantdiary
sudo nginx -t
sudo systemctl reload nginx

echo "3. Verify"
curl -fsS http://localhost:8080/api/health
systemctl status plantdiary --no-pager
