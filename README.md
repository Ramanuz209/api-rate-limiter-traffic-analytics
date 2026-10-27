# API Rate Limiting & Real-time Traffic Analytics Platform

[![Node.js Version](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Redis Sliding Window](https://img.shields.io/badge/RateLimiter-Redis%20Lua%20Sliding%20Window-red.svg)](https://redis.io/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-blue.svg)](https://react.dev/)
[![Recharts](https://img.shields.io/badge/Charts-Recharts-blueviolet.svg)](https://recharts.org/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%7C%20PostgreSQL%20%7C%20SQLite-orange.svg)](https://sequelize.org/)
[![Deployment](https://img.shields.io/badge/Deploy-Render-black.svg)](https://render.com/)

> **MystartupTV Technical Assignment Submission**  
> An enterprise-grade, distributed rate limiting and traffic analytics platform engineered to control API traffic across multi-tenant clients, eliminate concurrency race conditions using atomic sliding-window Lua scripts, and provide real-time traffic observability.

---

## 🌟 Key Capabilities & Architectural Highlights

- **Atomic Sliding Window Rate Limiting**: Implements a precise sliding window log via Redis Sorted Sets (`ZSET`) and atomic Lua scripting, mathematically preventing the boundary double-burst vulnerability inherent to fixed-window systems.
- **Strict Concurrency Safety**: Guaranteed atomic evaluation that eliminates check-then-increment race conditions under high concurrent load (verified with automated burst tests).
- **Multi-Tenant Tiered Policies**: Configurable policies per client tier (Enterprise: 200/min, Standard: 60/min, Free: 20/min, Strict Microburst: 5/10s, and Anonymous IP fallback).
- **RFC Standard Compliance**: Emits RFC-standard HTTP response headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`) with structured 429 Too Many Requests payloads.
- **Real-Time Observability Dashboard (React + Recharts)**:
  - Live throughput volume (Allowed vs Rate-Limited requests over time).
  - Latency trends and response duration metrics (Average, Min, Max).
  - HTTP Status Code distribution (Donut chart: 200, 429, 401, 500).
  - Client usage and top endpoint breakdowns.
- **Interactive Live Simulator & Concurrency Burst Tester**: Test rate-limiting policies and fire 1, 5, 10, or 25 concurrent requests directly from the UI with real-time feedback.
- **Multi-Database Agnostic Core**: Operates seamlessly on **MySQL** (XAMPP local), **PostgreSQL** (Render / Cloud production), and **SQLite** (zero-config fallback).
- **Zero-Failure Architecture**: Built-in high-performance in-memory sliding window fallback that automatically activates if Redis is temporarily unreachable.

---

## 🏗️ System Architecture

```
Client Requests (X-API-KEY / IP)
               │
               ▼
   [ Rate Limiter Middleware ]
               │
               ▼
   [ Redis Node / Lua Script ]  ◄── (Automatic Fallback) ──► [ In-Memory Sliding Window ]
   - ZREMRANGEBYSCORE (Evict expired)
   - ZCARD (Count current requests in window)
   - ZADD & PEXPIRE (Atomic registration)
               │
        ┌──────┴──────┐
 [ Allowed: 200 ]  [ Exceeded: 429 ]
        │                 │
        ▼                 ▼
   Target API        Retry-After Header
        │                 │
        └────────┬────────┘
                 ▼
     [ Non-blocking Logger ]
     - In-memory Ring Buffer (Instant latency)
     - Asynchronous Bulk DB Persist (MySQL/PostgreSQL/SQLite)
                 │
                 ▼
  [ Real-Time React Dashboard ]
```

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- **Node.js**: v18 or later (`node -v`)
- **Database (Choose One)**:
  - **Option A (XAMPP MySQL)**: Start MySQL in XAMPP. The app connects to `127.0.0.1:3306` with database `rate_limiter_db`.
  - **Option B (Zero-config SQLite)**: Set `DB_DIALECT=sqlite` in `.env` (no installation required).
  - **Option C (PostgreSQL)**: Set `DATABASE_URL=postgres://...` in `.env`.
- **Redis (Optional)**: If local Redis or `REDIS_URL` is not present, the platform automatically activates the in-memory atomic sliding window engine without interruption.

### 1. Clone & Install Dependencies
```bash
git clone <your-repository-url>
cd <repository-directory>

# Install both backend and frontend dependencies
npm run install:all
```

### 2. Configure Environment Variables
A pre-configured `.env` is ready in `backend/.env`. You can adjust it if needed:
```env
PORT=5000
NODE_ENV=development

# MySQL (XAMPP Default)
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=rate_limiter_db

# Redis (Optional)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 3. Build & Run
```bash
# Option A: Run Full Application (Backend + Frontend built)
npm run build
npm start

# Access the Platform:
# Dashboard & API: http://localhost:5000
# Health Check: http://localhost:5000/api/health
```

### Option B: Run in Concurrent Dev Mode
```bash
# Terminal 1 (Backend with nodemon):
cd backend && npm run dev

# Terminal 2 (Frontend with Vite HMR):
cd frontend && npm run dev
# Vite UI will be available on http://localhost:3000
```

---

## 🧪 Testing & Verification

### 1. Automated Jest & Supertest Suite
Includes unit tests, limit enforcement tests, and high-concurrency race condition tests:
```bash
npm test
```
**Sample Output:**
```
PASS tests/rateLimiter.test.js
  API Rate Limiter & Concurrency Test Suite
    1. Health and Status Endpoint
      √ should return health status and storage engine info
    2. Rate Limiting Headers & Enforcement
      √ should allow requests under the limit and set proper rate limit headers
      √ should reject invalid or unknown API keys with 401 Unauthorized
      √ should strictly enforce limits and return 429 Too Many Requests when quota exceeded
    3. High Concurrency Race Condition Test
      √ should correctly handle concurrent requests without race conditions (20 concurrent)
    4. Analytics and Management Endpoints
      √ should return overview metrics with expected data structure
      √ should list all rate limit policies

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

### 2. Postman Testing
Import the ready-to-use Postman collection:
- Collection file: `backend/postman_collection.json`
- Includes pre-configured requests for Enterprise, Standard, Free, Strict Burst, Anonymous IP, and Analytics endpoints.

### 3. Interactive UI Simulator
1. Open `http://localhost:5000` in your browser.
2. Navigate to the **"Live Simulator"** tab.
3. Select **"Demo Strict Burst (5 req / 10s)"**.
4. Choose **10 Reqs** or **25 Reqs** concurrent burst.
5. Click **"Fire Traffic Burst"** to watch the sliding window cutoff in real time!

---

## ☁️ Deployment on Render

This repository includes a native `render.yaml` Blueprint and step-by-step instructions:
- **Comprehensive Guide**: Read [`docs/DEPLOYMENT_RENDER.md`](docs/DEPLOYMENT_RENDER.md)
- **Render Settings**:
  - **Build Command**: `npm run install:all && npm run build`
  - **Start Command**: `npm run start`
  - **Health Check Path**: `/api/health`

---

## 📡 API Reference

### Rate Limited Endpoints (`/api/v1/*`)
Requires header: `X-API-KEY: <key>` (or falls back to IP limit)

- `GET /api/v1/data`: Sample protected business payload.
- `GET /api/v1/search?q=query`: Search mock with latency simulation.
- `POST /api/v1/transactions`: Transaction creation endpoint.
- `GET /api/v1/ping`: Health / latency micro-endpoint.

### Analytics Endpoints (`/api/analytics/*`)
- `GET /api/analytics/overview?timeframe=60`: Total requests, blocked count, average latency, and engine status.
- `GET /api/analytics/traffic?minutes=30`: Time-series traffic data for Recharts area charts.
- `GET /api/analytics/status-distribution`: Status code counts (200, 429, 401, 500).
- `GET /api/analytics/clients`: Top clients and rate-limit hit rates.
- `GET /api/analytics/endpoints`: Top requested routes and average latency.
- `GET /api/analytics/logs?limit=50`: Searchable, filterable audit log stream.

---

## 📚 Technical Documentation
- [Architecture & Concurrency Deep Dive](docs/ARCHITECTURE.md)
- [Render Deployment from Scratch](docs/DEPLOYMENT_RENDER.md)

---

## 📄 License
MIT License. Developed for technical evaluation by MystartupTV Team.

