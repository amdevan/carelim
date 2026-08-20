# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma needs DATABASE_URL to resolve the provider during generate
ENV DATABASE_URL="postgresql://carelim:carelim123@localhost:5432/carelim?schema=public"

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy full app source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output
COPY --from=builder /app/.next/standalone/ ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# Copy public directory
COPY --from=builder /app/public ./public

# Copy Prisma schema (needed at runtime for migrations)
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "server.js"]
