# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json* ./
COPY packages/ packages/
COPY apps/backend/ apps/backend/

# Install dependencies
RUN npm install --include=dev

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the backend
WORKDIR /app/apps/backend
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output and dependencies
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/node_modules ./node_modules

# Copy Prisma schema and client (needed at runtime for db operations)
COPY --from=builder /app/packages/database/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/server.js"]
