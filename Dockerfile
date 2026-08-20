# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma needs DATABASE_URL to resolve the provider during generate
ENV DATABASE_URL="postgresql://carelim:carelim123@localhost:5432/carelim?schema=public"

# Copy everything into a temp dir, then flatten (avoids space-in-path issues)
COPY . /src/
RUN cp -r /src/"Carelim OS"/* /app/ && cp -r /src/"Carelim OS"/.[!.]* /app/ 2>/dev/null; true
RUN rm -rf /src

# Install dependencies
RUN npm install

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

# Create directory for database-related files
RUN mkdir -p /app/db

EXPOSE 3000

CMD ["node", "server.js"]
