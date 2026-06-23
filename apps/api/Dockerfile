# Stage 1 – Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY packages/db ./packages/db
COPY apps/api ./apps/api
RUN pnpm --filter @amdox/db db:generate
RUN pnpm --filter @amdox/api build

# Stage 2 – Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm i -g pnpm
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/packages/db ./packages/db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health/live || exit 1

USER node
CMD ["node", "dist/main"]
