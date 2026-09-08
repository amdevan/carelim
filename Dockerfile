# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root and all apps/packages
COPY package.json package-lock.json* ./
COPY apps/ apps/
COPY packages/ packages/

# Install all workspace dependencies
RUN npm install --include=dev

# Generate Prisma client from the frontend schema (Prisma 7 compatible)
WORKDIR /app/apps/frontend
RUN npx prisma generate

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

# Copy public assets
COPY --from=builder /app/apps/frontend/public ./public

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
