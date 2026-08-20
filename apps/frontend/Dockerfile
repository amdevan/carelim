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

# Build the frontend app
WORKDIR /app/apps/frontend
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone output
COPY --from=builder /app/apps/frontend/.next/standalone/apps/frontend/ ./

# Copy static assets
COPY --from=builder /app/apps/frontend/.next/static ./.next/static

# Copy Prisma schema and client
COPY --from=builder /app/packages/database/prisma ./prisma
COPY --from=builder /app/apps/frontend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/apps/frontend/node_modules/@prisma ./node_modules/@prisma

# Install prisma CLI for runtime migrations
RUN cd /tmp && mkdir prisma-install && cd prisma-install && \
    npm init -y > /dev/null 2>&1 && \
    npm install prisma@$(node -e "console.log(require('/app/node_modules/@prisma/client/package.json').version)") && \
    cp -rn node_modules/* /app/node_modules/ && \
    cp -r node_modules/.bin /app/node_modules/ && \
    rm -rf /tmp/prisma-install

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
