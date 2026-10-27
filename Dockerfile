# Multi-stage Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Install frontend dependencies and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend ./frontend
RUN cd frontend && npm run build

# 2. Install backend dependencies and copy source code
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend ./backend

# Final production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
ENV DB_DIALECT=sqlite

COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 10000

CMD ["node", "backend/src/server.js"]
