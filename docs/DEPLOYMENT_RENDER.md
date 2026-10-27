# Step-by-Step Render Deployment Guide (From Scratch)

This guide walks you through deploying the **API Rate Limiting & Traffic Analytics Platform** to **Render** completely free and with zero friction.

---

## Prerequisites
1. A free account on [Render.com](https://render.com).
2. A free GitHub account with this repository pushed to your GitHub.
3. (Optional but recommended) A free Redis instance from [Upstash.com](https://upstash.com) or Render Redis.

---

## Option 1: Automatic Blueprint Deployment (Recommended)

1. Push your repository to GitHub.
2. Log into your Render dashboard.
3. Click **"New +"** in the top right corner and select **"Blueprint"**.
4. Connect your GitHub repository containing `render.yaml`.
5. Render will automatically read `render.yaml`, configure the build command, start command, and environment variables.
6. Click **"Apply"**. Render will build and deploy your unified application.

---

## Option 2: Manual Web Service Setup (Step-by-Step)

### Step 1: Create a Web Service
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Choose **"Build and deploy from a Git repository"** and select your repository.

### Step 2: Configure Service Settings
Fill in the following fields:

- **Name**: `rateflow-platform` (or your chosen name)
- **Region**: Choose the closest region (e.g., Oregon, Frankfurt, Singapore)
- **Branch**: `main`
- **Root Directory**: Leave blank (root of repo)
- **Runtime**: `Node`
- **Build Command**:
  ```bash
  npm run install:all && npm run build
  ```
- **Start Command**:
  ```bash
  npm run start
  ```
- **Plan**: `Free`

### Step 3: Add Environment Variables
Under the **Environment Variables** section, add:

| Key | Recommended Value | Note |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Render standard port |
| `DB_DIALECT` | `sqlite` | Out-of-the-box zero-config database |
| `REDIS_URL` | *(Optional)* | Upstash or Redis connection URL |

> **Pro-Tip regarding Database & Redis on Render:**
> - **Database:** If `DATABASE_URL` is not provided, the application will automatically initialize a persistent SQLite database. If you wish to use PostgreSQL, click **"New +" -> "PostgreSQL"** on Render, copy the **Internal Database URL**, and paste it as `DATABASE_URL`.
> - **Redis:** If you don't provide a `REDIS_URL`, the application automatically activates the **In-Memory Atomic Sliding Window Engine**, ensuring 100% uptime with no extra configuration needed! For a real Redis cluster, create a free database on [Upstash Redis](https://upstash.com) and paste the `redis://...` URL into `REDIS_URL`.

### Step 4: Deploy & Verify
1. Click **"Create Web Service"**.
2. Render will build the frontend assets, install backend dependencies, and launch the server.
3. Once the deployment finishes, open your Render URL (e.g. `https://rateflow-platform.onrender.com`).
4. You will see the full live interactive dashboard!
5. Test the health endpoint: `https://rateflow-platform.onrender.com/api/health`.

---

## Testing Live Deployment via Postman or Browser
- In the dashboard, switch to the **"Live Simulator"** tab.
- Click **"Fire Traffic Burst"** to test 5, 10, or 25 concurrent requests.
- Watch the charts and audit log stream update instantly in real time!
- Import `backend/postman_collection.json` into Postman, change `baseUrl` to your Render URL, and run the automated collection runner!

