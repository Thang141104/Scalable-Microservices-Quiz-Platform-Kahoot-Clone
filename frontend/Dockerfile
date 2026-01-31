# Frontend Dockerfile
FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY . .

# Accept build-time API URL (can be overridden)
ARG REACT_APP_API_URL=http://gateway:3000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy build files from build stage
COPY --from=build /app/build ./build

# Create entrypoint script for runtime config
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'echo "window._env_ = {" > /app/build/env-config.js' >> /docker-entrypoint.sh && \
    echo 'echo "  REACT_APP_API_URL: \"$REACT_APP_API_URL\"," >> /app/build/env-config.js' >> /docker-entrypoint.sh && \
    echo 'echo "  REACT_APP_SOCKET_URL: \"$REACT_APP_SOCKET_URL\"" >> /app/build/env-config.js' >> /docker-entrypoint.sh && \
    echo 'echo "}" >> /app/build/env-config.js' >> /docker-entrypoint.sh && \
    echo 'exec serve -s build -l 3006' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose port
EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3006 || exit 1

# Use entrypoint to generate config at runtime
ENTRYPOINT ["/docker-entrypoint.sh"]
