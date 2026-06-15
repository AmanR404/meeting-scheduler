# Teacher Meeting Scheduler & Attendance Management System

A centralized platform to schedule Google Meet meetings, auto-manage calendars, send reminders, track attendance, and generate reports — replacing the manual mix of Calendar, Meet, Email, and Excel.

> **Status:** In active development. See the build progress in commit history.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Redux Toolkit |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | Google OAuth 2.0, JWT, secure cookies, RBAC |
| Google APIs | Calendar, Meet, Gmail, Admin SDK Reports (attendance) |
| Jobs/Email | BullMQ + Redis (reminders), Nodemailer |
| Reports | PDFKit (PDF), ExcelJS (.xlsx) |
| Docs | Swagger / OpenAPI |
| Deployment | Docker, Docker Compose, Nginx |

## Repository Structure

```
.
├── backend/            # Express + TypeScript API
│   ├── src/
│   │   ├── config/     # env, logger, database
│   │   ├── models/     # Mongoose schemas
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/ # auth, RBAC, rate limiting, errors
│   │   ├── services/   # Google, email, reports
│   │   ├── jobs/       # BullMQ reminder workers
│   │   ├── utils/
│   │   └── validators/ # Zod schemas
│   ├── credentials/    # google-service-account.json (git-ignored)
│   └── .env.example
├── frontend/           # Next.js app (App Router, Redux Toolkit, Tailwind)
│   └── src/
│       ├── app/        # routes: login, dashboard, meetings, reports, availability
│       ├── components/ # AppShell, Navbar, MeetingCard, UI primitives
│       ├── store/      # Redux Toolkit (auth slice)
│       └── lib/        # axios API client, formatters
├── docker-compose.yml  # conflict-safe stack (backend, frontend, redis, optional mongo)
└── docs/               # openapi.json, ER diagram, deployment guide
```

## Roles

- **Teacher (Organizer):** create/edit/cancel meetings, manage availability, view & export reports.
- **Candidate (Participant):** view assigned meetings, join, view attendance history.

## Getting Started (Backend, local)

```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run dev               # starts on http://localhost:5000
```

- Health check: `GET http://localhost:5000/api/health`
- API docs (Swagger UI): `http://localhost:5000/api/docs`
- Reminders need Redis: `docker run -d -p 6379:6379 --name ms-redis redis:7-alpine`

### Frontend (local)

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev                        # http://localhost:3000
```

Open `http://localhost:3000`, click **Continue with Google**, and you'll land on the dashboard.

### Required environment

See [`backend/.env.example`](backend/.env.example): MongoDB connection string, Google OAuth Client ID/Secret, Google service-account JSON path (for Workspace attendance), Gmail SMTP app password, Redis host/port, and attendance thresholds. Step-by-step credential setup is in [`SETUP_GUIDE.md`](SETUP_GUIDE.md).

## Run with Docker

Conflict-safe stack (namespaced `ms-*`, Redis/Mongo not published to host, Mongo behind a profile so it won't clash with other databases on your machine):

```bash
docker compose up -d --build              # backend + redis (Mongo = Atlas via .env)
docker compose --profile local-db up -d   # also run a bundled MongoDB
BACKEND_PORT=5050 docker compose up -d     # change host port if 5000 is taken
```

Full instructions: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Backend scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the API in watch mode (ts-node + nodemon) |
| `npm run build` / `npm start` | Compile TypeScript / run compiled server |
| `npm run worker` | Run the reminder worker as a standalone process |
| `npm run seed` | Seed a teacher, candidates, and a sample meeting |
| `npm run docs:gen` | Export the OpenAPI spec to `docs/openapi.json` |
| `npm test` | Run tests |

## API Endpoints (overview)

| Area | Endpoints |
|------|-----------|
| Auth | `GET /api/auth/google`, `GET /api/auth/google/callback`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Meetings | `POST/GET /api/meetings`, `GET /api/meetings/:id`, `PATCH /api/meetings/:id/reschedule`, `DELETE /api/meetings/:id`, `GET /api/meetings/candidates` |
| Attendance | `POST /api/attendance/:meetingId/join`, `POST /api/attendance/:meetingId/heartbeat`, `POST /api/attendance/:meetingId/sync`, `GET /api/attendance/meeting/:meetingId`, `GET /api/attendance/me`, `PATCH /api/attendance/:id` |
| Reports | `GET /api/reports/meeting/:meetingId`, `GET /api/reports/summary` (`?format=json\|pdf\|xlsx`) |
| Dashboard | `GET /api/dashboard` |

Full request/response schemas, auth requirements, and error codes are in the live Swagger UI at `/api/docs` and the exported spec at [`docs/openapi.json`](docs/openapi.json).

## Documentation

- Setup & credentials walkthrough: [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
- Deployment guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Database ER diagram: [`docs/ER-diagram.md`](docs/ER-diagram.md)
- API spec (OpenAPI): [`docs/openapi.json`](docs/openapi.json) · live UI at `/api/docs`

## License

MIT
