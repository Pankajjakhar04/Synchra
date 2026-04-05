# ─── Stage 1: Builder ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production=false

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ─── Stage 2: Production Image ───────────────────────────────────
FROM node:22-alpine AS runner

# Non-root user for security
RUN addgroup --system synchra && adduser --system --ingroup synchra synchra

WORKDIR /app

# Copy built artifacts + production deps
COPY --from=builder --chown=synchra:synchra /app/dist ./dist
COPY --from=builder --chown=synchra:synchra /app/node_modules ./node_modules
COPY --from=builder --chown=synchra:synchra /app/package.json ./

USER synchra

# Cloud Run: PORT env var is provided by the platform
ENV NODE_ENV=production
EXPOSE 3001

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
