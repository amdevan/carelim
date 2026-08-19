# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma needs DATABASE_URL to resolve the provider during generate
ENV DATABASE_URL="file:./db/custom.db"

# Copy package files from the subdirectory
COPY Carelim\ OS/package.json Carelim\ OS/package-lock.json ./

# Install dependencies (using npm 10.x lock file)
RUN npm ci

# Copy the full app source
COPY Carelim\ OS/ ./

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output (flatten one level if nested)
COPY --from=builder /app/.next/standalone/ /app/standalone-tmp/

# Find and copy the server.js - handle both flat and nested standalone output
RUN if [ -f /app/standalone-tmp/server.js ]; then \
      cp -r /app/standalone-tmp/* /app/ && rm -rf /app/standalone-tmp; \
    else \
      cp -r /app/standalone-tmp/*/  /app/ && rm -rf /app/standalone-tmp; \
    fi

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# Copy public directory
COPY --from=builder /app/public ./public

# Copy Prisma schema (needed at runtime for migrations)
COPY --from=builder /app/prisma ./prisma

# Create db directory for SQLite persistence (mount volume here)
RUN mkdir -p /app/db

EXPOSE 3000

CMD ["node", "server.js"]
