# Multi-stage build for TapSign

# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
RUN npm run build

# Stage 2: Build backend and final image
FROM node:20-alpine

WORKDIR /app

# Install dependencies for sharp (image processing)
RUN apk add --no-cache \
  vips-dev \
  fftw-dev \
  build-base \
  python3

# Copy backend package files
COPY package*.json ./
COPY prisma/ ./prisma/

# Install backend dependencies
RUN npm install --production
RUN npx prisma generate

# Copy backend source
COPY src/ ./src/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/dist ./client/dist

# Create storage directory
RUN mkdir -p /app/storage/pdfs /app/storage/signatures

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && npm start"]
