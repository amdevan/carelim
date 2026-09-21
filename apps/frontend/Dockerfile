# ---- Build Stage ----
FROM node:22-alpine AS builder

ARG DATABASE_URL
WORKDIR /app

# Copy workspace root and all apps/packages
COPY package.json package-lock.json* ./
COPY apps/ apps/
COPY packages/ packages/

# Install all workspace dependencies
RUN npm install --include=dev

# Generate Prisma client from the frontend's own schema
WORKDIR /app/apps/frontend
RUN npx prisma generate

# Push schema to database (requires DATABASE_URL build arg)
RUN npx prisma db push --accept-data-loss 2>&1 || echo "Warning: prisma db push failed (database may not be reachable at build time)"

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Copy Prisma adapter + pg for runtime schema sync.
# Cherry-picking single packages misses transitive deps (pg crashed on
# pg-types at boot), so install a complete isolated tree in a stage instead.
FROM builder AS rtdeps
RUN mkdir -p /tmp/rt && cd /tmp/rt && npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund pg@^8.23.0 @prisma/adapter-pg@^7.10.0

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone output (server.js + node_modules)
COPY --from=builder /app/apps/frontend/.next/standalone/apps/frontend/ ./
COPY --from=builder /app/apps/frontend/.next/standalone/node_modules ./node_modules

# Copy static assets
COPY --from=builder /app/apps/frontend/.next/static ./.next/static

# Copy public assets (images, favicon, etc.)
COPY --from=builder /app/apps/frontend/public ./public

# Ensure uploads directory exists and is writable
RUN mkdir -p ./public/uploads/logos && chmod 777 ./public/uploads/logos

# Copy Prisma adapter + complete pg dependency tree (pg, pg-types, pg-protocol, ...)
COPY --from=rtdeps /tmp/rt/node_modules ./node_modules

# Copy Prisma schema for runtime use
COPY --from=builder /app/apps/frontend/prisma ./prisma

# Copy schema-sync script (run by entrypoint and instrumentation fallback)
COPY --from=builder /app/apps/frontend/scripts ./scripts

# Copy entrypoint
COPY apps/frontend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
