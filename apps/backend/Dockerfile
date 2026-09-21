# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root files and packages
COPY package.json package-lock.json* ./
COPY packages/ packages/
COPY apps/backend/ apps/backend/
# schema-sync script is shared with the frontend (runs at backend boot)
COPY apps/frontend/scripts ./apps/frontend/scripts

# Install dependencies
RUN npm install --include=dev

# Generate Prisma client from database schema (Prisma 7 — url is in prisma.config.ts)
WORKDIR /app/packages/database
RUN npx prisma generate
WORKDIR /app

# Build the backend
WORKDIR /app/apps/backend
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./

# Copy node_modules from ROOT (npm workspaces hoists deps there)
COPY --from=builder /app/node_modules ./node_modules
# npm may install some deps per-workspace instead of hoisting — merge them in
COPY --from=builder /app/apps/backend/node_modules ./node_modules

# Copy Prisma schema and client (needed at runtime)
COPY --from=builder /app/packages/database/prisma ./prisma

# Copy schema-sync script (runs at boot via entrypoint)
COPY --from=builder /app/apps/frontend/scripts ./scripts

# Copy entrypoint (schema sync + server start)
COPY apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4000

CMD ["./docker-entrypoint.sh"]
