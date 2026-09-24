# syntax=docker/dockerfile:1
# Production image for the Rental Manager API.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# sharp ships prebuilt musl binaries as optional dependencies.
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=5000 \
    STORAGE_LOCAL_DIR=/data/storage \
    LEGACY_UPLOADS_DIR=/data/uploads
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /data/storage /data/uploads && chown -R app:app /data
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY src ./src
COPY scripts ./scripts
COPY assets ./assets
USER app
EXPOSE 5000
# /ready also checks the database connection.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ready >/dev/null || exit 1
CMD ["node", "server.js"]
