# Deployment Guide

## 1. Prerequisites

- Node.js 20+ and npm (for local/dev runs)
- Docker + Docker Compose (for containerized runs)
- A MongoDB database — MongoDB Atlas (recommended) or the bundled Mongo container
- Google Cloud OAuth credentials + (optional) Workspace service account — see [`../SETUP_GUIDE.md`](../SETUP_GUIDE.md)
- Redis (bundled in Docker Compose) for reminder scheduling

## 2. Environment

Copy and fill the backend environment file:

```bash
cd backend
cp .env.example .env
# fill in MONGODB_URI, Google OAuth, email, etc.
```

Place the Google service-account JSON at `backend/credentials/google-service-account.json` (git-ignored).

## 3. Run with Docker Compose (recommended)

> This stack is **conflict-safe** for a machine already running other DBs in Docker:
> containers are namespaced `ms-*`, Redis/Mongo publish **no host ports** by default,
> and the bundled Mongo only runs under the `local-db` profile.

Using MongoDB Atlas (default — `MONGODB_URI` in `backend/.env` points to Atlas):

```bash
docker compose up -d --build
```

Using the bundled local MongoDB instead of Atlas:

1. In `docker-compose.yml`, uncomment the `MONGODB_URI: mongodb://ms-mongo:27017/meeting_scheduler` line under `ms-backend`.
2. Start with the profile:

```bash
docker compose --profile local-db up -d --build
```

Change the host port if 5000 is taken:

```bash
BACKEND_PORT=5050 docker compose up -d --build
```

Verify:

- API health: `http://localhost:5000/api/health`
- Swagger UI: `http://localhost:5000/api/docs`

Stop / clean up (does not touch your other projects' containers):

```bash
docker compose down            # stop
docker compose down -v         # stop + remove ms-* volumes
```

## 4. Run without Docker (local dev)

```bash
# Redis (needed for reminders) — pick one:
docker run -d -p 6379:6379 --name ms-redis redis:7-alpine
#   or: brew install redis && brew services start redis

cd backend
npm install
npm run dev          # http://localhost:5000
# optional: npm run worker   # run the reminder worker as a separate process
# optional: npm run seed     # seed a teacher, candidates, and a sample meeting
```

## 5. Cloud deployment (AWS / Azure)

The backend is a standard stateless Node container; any container host works:

- **AWS:** push the image to ECR, run on ECS Fargate (or App Runner). Use MongoDB Atlas and a managed Redis (ElastiCache or Redis Cloud). Put it behind an Application Load Balancer with HTTPS.
- **Azure:** push to ACR, run on Azure Container Apps (or App Service for Containers). Use Atlas + Azure Cache for Redis.

Required environment variables are the same as `backend/.env.example`. Set `NODE_ENV=production`, a strong `JWT_SECRET`, the production `CLIENT_URL`/`SERVER_URL`, and add the deployed callback URL to the Google OAuth client's authorized redirect URIs.

## 6. Production notes

- Run behind a reverse proxy / load balancer terminating TLS (cookies are `secure` when `NODE_ENV=production`).
- Run at least one reminder worker (in-process by default; scale out with `npm run worker`).
- Set MongoDB Atlas network access and Redis auth appropriately.
- Rotate `JWT_SECRET` and Google credentials as needed; never commit `.env` or the service-account JSON.
