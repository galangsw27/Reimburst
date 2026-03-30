# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat postgresql-client
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm install

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_WEBHOOK_URL
ARG NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL
ARG NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL
ARG NEXT_PUBLIC_MYORBIT_WEBHOOK_URL
ARG NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_WEBHOOK_URL=$NEXT_PUBLIC_WEBHOOK_URL
ENV NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL=$NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL
ENV NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL=$NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL
ENV NEXT_PUBLIC_MYORBIT_WEBHOOK_URL=$NEXT_PUBLIC_MYORBIT_WEBHOOK_URL
ENV NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL=$NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime dependencies
RUN apk add --no-cache postgresql-client curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
# Note: public folder may not exist in standalone mode, so we conditionally copy
RUN mkdir -p public && cp -r public/. /app/public/ 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy scripts for database operations
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs package.json ./

USER nextjs

# Railway uses PORT env variable, default to 3000 for local
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use PORT from environment or default to 3000
CMD node server.js
