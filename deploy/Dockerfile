# Runtime-only image: the static linux/amd64 binary is cross-compiled on the
# build machine (CGO_ENABLED=0, pure-Go sqlite), so no Go toolchain is needed here.
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata curl \
    && addgroup -g 1000 plantdiary \
    && adduser -D -u 1000 -G plantdiary plantdiary

WORKDIR /app
COPY bin/plantdiary-server /app/plantdiary-server
COPY frontend /app/frontend

USER plantdiary
EXPOSE 8080

ENV PORT=8080 \
    DB_PATH=/data/plantdiary.db \
    UPLOAD_PATH=/data/uploads \
    FRONTEND_DIST=/app/frontend \
    GIN_MODE=release

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD curl -fsS http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/plantdiary-server"]
