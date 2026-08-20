# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Prisma needs DATABASE_URL to resolve the provider during generate
ENV DATABASE_URL="postgresql://carelim:carelim123@localhost:5432/carelim?schema=public"

# Copy everything into a temp dir, then flatten (avoids space-in-path issues)
COPY . /src/
RUN cp -r /src/"Carelim OS"/* /app/ && cp -r /src/"Carelim OS"/.[!.]* /app/ 2>/dev/null; true
RUN rm -rf /src

# Install dependencies (--include=dev required for build tools like @tailwindcss/postcss)
RUN npm install --include=dev

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (standalone output)
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy the standalone output (server.js + node_modules + .next with server code)
COPY --from=builder /app/.next/standalone/ ./

# Overwrite .next/static with the full static assets (standalone doesn't include them)
COPY --from=builder /app/.next/static ./.next/static

# Copy public directory (standalone doesn't include it)
COPY --from=builder /app/public ./public

# Copy Prisma schema and client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Install prisma CLI + all transitive deps in a temp dir, then merge into node_modules
RUN cd /tmp && mkdir prisma-install && cd prisma-install && \
    npm init -y > /dev/null 2>&1 && \
    npm install prisma@$(node -e "console.log(require('/app/node_modules/@prisma/client/package.json').version)") && \
    cp -r node_modules/* /app/node_modules/ && \
    rm -rf /tmp/prisma-install

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
