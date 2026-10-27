# Multi-stage Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install frontend dependencies and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend
RUN cd frontend && npm run build

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Final production stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
