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
RUN npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Warning: prisma db push failed (database may not be reachable at build time)"

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

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

# Copy Prisma adapter for runtime migrations
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder /app/node_modules/pg ./node_modules/pg

# Copy Prisma schema for runtime use
COPY --from=builder /app/apps/frontend/prisma ./prisma

# Copy entrypoint
COPY apps/frontend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
