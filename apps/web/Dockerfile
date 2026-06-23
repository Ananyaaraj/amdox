# Stage 1 – Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile

# Stage 2 – Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web ./apps/web
COPY apps/web/.env.production* ./apps/web/
RUN pnpm --filter @amdox/web build

# Stage 3 – Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:3000 || exit 1
USER node
CMD ["node", "apps/web/server.js"]
