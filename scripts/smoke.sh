#!/usr/bin/env bash
# End-to-end smoke test for PlantDiary: register → login → garden → plant →
# care → photo → dashboard → calendar → notifications.
# Usage: ./scripts/smoke.sh [BASE_URL]   (default http://localhost:8099)
set -euo pipefail

BASE="${1:-http://localhost:8099}"
EMAIL="smoke-$(date +%s)@plantdiary.app"
PASS="SmokeTest1"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Safe dotted-path accessor (supports foo.bar and foo[0].bar) — no eval.
json() { node -e '
const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
const path = process.argv[1].split(/[.\[\]]+/).filter(Boolean);
let v = d;
for (const k of path) v = v?.[k];
console.log(v ?? "");
' "$1"; }
step() { printf '✔ %s\n' "$1"; }

# 1. health
HEALTH=$(curl -sf "$BASE/api/health")
[ "$(echo "$HEALTH" | json status)" = "ok" ] || { echo "health not ok: $HEALTH"; exit 1; }
step "health: $HEALTH"

# 2. register
REG=$(curl -sf -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Smoke Tester\"}")
ACCESS=$(echo "$REG" | json access_token)
REFRESH=$(echo "$REG" | json refresh_token)
[ -n "$ACCESS" ] && [ -n "$REFRESH" ]
step "register ($EMAIL)"

# weak password must be rejected
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' -d '{"email":"x@y.zz","password":"weak","name":"x"}')
[ "$CODE" = "400" ] || { echo "weak password accepted ($CODE)"; exit 1; }
step "weak password rejected (400)"

# 3. login
LOGIN=$(curl -sf -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
ACCESS=$(echo "$LOGIN" | json access_token)
step "login"

AUTH=(-H "Authorization: Bearer $ACCESS")

# 4. refresh rotation
NEWPAIR=$(curl -sf -X POST "$BASE/api/auth/refresh" -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH\"}")
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/refresh" \
  -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$REFRESH\"}")
[ "$CODE" = "401" ] || { echo "rotated refresh token still valid ($CODE)"; exit 1; }
step "refresh rotation (old token revoked)"

# 5. unauthenticated request rejected
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/gardens")
[ "$CODE" = "401" ] || { echo "unauthenticated gardens returned $CODE"; exit 1; }
step "auth guard (401 without token)"

# 6. create garden
GARDEN=$(curl -sf -X POST "$BASE/api/gardens" "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Garden","description":"e2e","location_type":"outdoor","area_sqm":12.5}')
GID=$(echo "$GARDEN" | json garden.id)
[ -n "$GID" ]
step "garden created ($GID)"

# 7. library search + detail
LIB=$(curl -sf "$BASE/api/plants/library?search=pomidor" "${AUTH[@]}")
PLANT_LIB_ID=$(echo "$LIB" | json "plants[0].id")
[ -n "$PLANT_LIB_ID" ]
curl -sf "$BASE/api/plants/library/$PLANT_LIB_ID" "${AUTH[@]}" > /dev/null
curl -sf "$BASE/api/plants/library/$PLANT_LIB_ID/companions" "${AUTH[@]}" > /dev/null
curl -sf "$BASE/api/plants/library/categories" "${AUTH[@]}" > /dev/null
step "library search/detail/companions/categories ($PLANT_LIB_ID)"

# 8. add plant to garden
PLANT=$(curl -sf -X POST "$BASE/api/gardens/$GID/plants" "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d "{\"plant_library_id\":\"$PLANT_LIB_ID\",\"quantity\":3,\"planted_date\":\"2026-05-20T10:00:00Z\",\"location_notes\":\"bed A\"}")
PID=$(echo "$PLANT" | json plant.id)
[ -n "$PID" ]
step "plant added ($PID)"

# 9. log watering
CARE=$(curl -sf -X POST "$BASE/api/gardens/$GID/plants/$PID/care" "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"action":"watered","note":"smoke watering"}')
curl -sf "$BASE/api/gardens/$GID/plants/$PID/care" "${AUTH[@]}" > /dev/null
WATER_STATUS=$(curl -sf "$BASE/api/gardens/$GID/plants/$PID" "${AUTH[@]}" | json plant.care_status.water)
[ "$WATER_STATUS" = "ok" ] || { echo "expected water status ok, got $WATER_STATUS"; exit 1; }
step "care logged, water status = ok"

# 10. photo upload (1x1 PNG) + thumbnail + delete
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > "$TMP/test.png"
PHOTO=$(curl -sf -X POST "$BASE/api/gardens/$GID/plants/$PID/photos" "${AUTH[@]}" -F "photo=@$TMP/test.png")
PHOTO_URL=$(echo "$PHOTO" | json photo.url)
THUMB_URL=$(echo "$PHOTO" | json photo.thumb_url)
curl -sf "$BASE$PHOTO_URL" -o /dev/null
curl -sf "$BASE$THUMB_URL" -o /dev/null
step "photo uploaded, original + thumbnail served"

# oversized/wrong type rejected
printf 'not an image' > "$TMP/fake.jpg"
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/gardens/$GID/plants/$PID/photos" "${AUTH[@]}" -F "photo=@$TMP/fake.jpg")
[ "$CODE" = "400" ] || { echo "invalid image accepted ($CODE)"; exit 1; }
step "invalid image rejected (400)"

# 11. dashboard
DASH=$(curl -sf "$BASE/api/dashboard" "${AUTH[@]}")
GC=$(echo "$DASH" | json stats.garden_count)
PC=$(echo "$DASH" | json stats.plant_count)
[ "$GC" = "1" ] && [ "$PC" = "1" ] || { echo "dashboard stats wrong: gardens=$GC plants=$PC"; exit 1; }
step "dashboard (gardens=$GC plants=$PC)"

# 12. calendar + compatibility + notifications
curl -sf "$BASE/api/calendar?month=6&year=2026" "${AUTH[@]}" > /dev/null
curl -sf "$BASE/api/gardens/$GID/compatibility" "${AUTH[@]}" > /dev/null
curl -sf "$BASE/api/notifications" "${AUTH[@]}" > /dev/null
curl -sf -X POST "$BASE/api/notifications/read" "${AUTH[@]}" -o /dev/null
step "calendar, compatibility, notifications"

# 13. cross-user isolation: a second user must not see the first user's garden
REG2=$(curl -sf -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"smoke2-$(date +%s)@plantdiary.app\",\"password\":\"$PASS\",\"name\":\"Other\"}")
ACCESS2=$(echo "$REG2" | json access_token)
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/gardens/$GID" -H "Authorization: Bearer $ACCESS2")
[ "$CODE" = "404" ] || { echo "cross-user access leak ($CODE)"; exit 1; }
step "cross-user isolation (404)"

# 14. logout revokes refresh token
NEWREFRESH=$(echo "$NEWPAIR" | json refresh_token)
curl -sf -X POST "$BASE/api/auth/logout" -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$NEWREFRESH\"}" -o /dev/null
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/refresh" \
  -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$NEWREFRESH\"}")
[ "$CODE" = "401" ] || { echo "refresh after logout returned $CODE"; exit 1; }
step "logout revokes refresh token"

echo
echo "ALL SMOKE TESTS PASSED against $BASE"
