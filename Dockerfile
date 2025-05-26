# Multi-stage build for Synaptic
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY env.example ./

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S synaptic -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/env.example ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/uploads /app/backups && \
    chown -R synaptic:nodejs /app

# Copy health check script
COPY <<EOF /app/healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.SYNAPTIC_PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
EOF

# Set permissions
RUN chmod +x /app/healthcheck.js && \
    chown synaptic:nodejs /app/healthcheck.js

# Switch to non-root user
USER synaptic

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node /app/healthcheck.js

# Environment variables
ENV NODE_ENV=production
ENV SYNAPTIC_HOST=0.0.0.0
ENV SYNAPTIC_PORT=3000
ENV SYNAPTIC_DB_PATH=/app/data/synaptic.db
ENV SYNAPTIC_LOG_FILE=/app/logs/synaptic.log

# Start the application
CMD ["node", "dist/index.js"]

# Labels for metadata
LABEL name="synaptic"
LABEL version="1.0.0"
LABEL description="Synaptic - Decentralized MCP"
LABEL maintainer="Synaptic Team <team@synapticmcp.xyz>"
LABEL org.opencontainers.image.title="Synaptic"
LABEL org.opencontainers.image.description="Decentralized MCP"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Synaptic Team"
LABEL org.opencontainers.image.url="https://synapticmcp.xyz"
LABEL org.opencontainers.image.source="https://github.com/Synaptic-MCP/Synaptic"
LABEL org.opencontainers.image.documentation="https://docs.synapticmcp.xyz"
LABEL org.opencontainers.image.licenses="MIT" 