# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma needs DATABASE_URL to resolve the provider during generate
ENV DATABASE_URL="postgresql://carelim:carelim123@localhost:5432/carelim?schema=public"

# Copy workspace root and all apps/packages
COPY package.json package-lock.json* ./
COPY apps/ apps/
COPY packages/ packages/

# Install all workspace dependencies
RUN npm install --include=dev

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the saas app
WORKDIR /app/apps/saas
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone output (server.js + node_modules)
COPY --from=builder /app/apps/saas/.next/standalone/apps/saas/ ./
COPY --from=builder /app/apps/saas/.next/standalone/node_modules ./node_modules

# Copy static assets
COPY --from=builder /app/apps/saas/.next/static ./.next/static

# Copy Prisma schema and client
COPY --from=builder /app/packages/database/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

CMD ["node", "server.js"]
