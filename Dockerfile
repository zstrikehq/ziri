# Multi-stage build for ZIRI Proxy
# Stage 1: Builder
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/proxy/package.json ./packages/proxy/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies (using npm install since lock file may be out of sync after rename)
RUN npm install

# Copy source files
COPY packages/proxy ./packages/proxy
COPY packages/ui ./packages/ui

# Build proxy (which builds UI and copies it)
RUN npm run build:proxy

# Stage 2: Runtime
FROM node:20-alpine

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy built proxy and package.json
COPY --from=builder /app/packages/proxy/dist ./dist
COPY --from=builder /app/packages/proxy/package.json ./

# Install production dependencies only (using npm install since we don't have isolated lock file)
RUN npm install --omit=dev

# Set environment variables
ENV CONFIG_DIR=/data
ENV PORT=3100
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Create volume mount point for persistence
VOLUME ["/data"]

# Expose port
EXPOSE 3100

# Start command
CMD ["node", "dist/index.js"]
