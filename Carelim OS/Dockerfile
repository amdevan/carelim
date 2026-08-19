FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone output (server.js is in the workspace subdirectory with a space)
COPY .next/standalone/ ./standalone/
RUN cp -r /app/standalone/Carelim/Carelim\ OS/* /app/ && rm -rf /app/standalone

COPY .next/static ./.next/static
COPY public ./public
COPY prisma ./prisma
COPY .env ./.env
COPY db ./db

EXPOSE 3000

CMD ["node", "server.js"]
