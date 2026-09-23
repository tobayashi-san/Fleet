# ── Stage 1: Build frontend ───────────────────────────────────
# Keep the Node release explicit so builds do not silently move to a different
# runtime. Update this value through the normal dependency-update process.
FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81 AS builder
WORKDIR /app
COPY frontend-next/package*.json ./frontend-next/
RUN cd frontend-next && npm ci
COPY frontend-next/ ./frontend-next/
RUN cd frontend-next && npm run build

# ── Stage 2: Runtime ─────────────────────────────────────────
# Use Debian for the runtime and native SQLite addon; both stages use Node 24.
FROM node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553

RUN apt-get update && apt-get install -y --no-install-recommends \
      ansible openssh-client openssl gosu curl unzip git build-essential util-linux \
    && rm -rf /var/lib/apt/lists/*

# Create a dedicated non-root user for runtime
RUN groupadd -r -g 1001 fleet && useradd -r -u 1001 -g fleet -d /app fleet

WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev \
    && apt-get purge -y --auto-remove build-essential
COPY server/ ./server/
COPY --from=builder /app/frontend-next/dist ./frontend-next/dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN mkdir -p /app/.ansible/tmp && chown -R fleet:fleet /app/.ansible
RUN mkdir -p /app/server/playbooks && chown -R fleet:fleet /app/server/playbooks
RUN mkdir -p /app/bundled-playbooks && cp -a /app/server/playbooks/. /app/bundled-playbooks/ && chown -R fleet:fleet /app/bundled-playbooks

VOLUME ["/app/server/data"]
EXPOSE 8443
ENV NODE_ENV=production
ENV PORT=8443
ENV TZ=Europe/Zurich

# Entrypoint runs as root to fix data-volume ownership, then drops to fleet
ENTRYPOINT ["./docker-entrypoint.sh"]
