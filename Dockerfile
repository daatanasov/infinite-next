# ─────────────────────────────────────────
# Base — shared Node version & workdir
# ─────────────────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app

# Install dependencies needed by some native modules
RUN apk add --no-cache libc6-compat

# ─────────────────────────────────────────
# Deps — install ALL dependencies (dev + prod)
# ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ─────────────────────────────────────────
# Development — hot-reload via `npm run dev`
# ─────────────────────────────────────────
FROM base AS development
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ─────────────────────────────────────────
# Builder — compile the production build
# ─────────────────────────────────────────
FROM base AS builder
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─────────────────────────────────────────
# Production — minimal runtime image
# ─────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy only what's needed to run the app
COPY --from=builder /app/public ./public

# next build with output: 'standalone' copies a minimal server + node_modules subset.
# If you haven't enabled standalone yet, fall back to copying .next + node_modules.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
