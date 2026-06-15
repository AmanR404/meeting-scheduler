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
├── frontend/           # Next.js app (added in Phase 7)
├── docker-compose.yml  # (added in Phase 8)
└── docs/               # API spec, ER diagram (added in Phase 8)
```

## Roles

- **Teacher (Organizer):** create/edit/cancel meetings, manage availability, view & export reports.
- **Candidate (Participant):** view assigned meetings, join, view attendance history.

## Getting Started (Backend)

```bash
cd backend
cp .env.example .env      # fill in your values
npm install
npm run dev               # starts on http://localhost:5000
```

Health check: `GET http://localhost:5000/api/health`

### Required environment

See [`backend/.env.example`](backend/.env.example). You'll need: a MongoDB connection string, Google OAuth Client ID/Secret, a Google service-account JSON (for attendance), Gmail SMTP app password, and a Redis instance (provided via Docker Compose in Phase 8).

## Documentation

- Setup & credentials walkthrough: [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
- API docs (Swagger): `http://localhost:5000/api/docs` *(added in Phase 8)*

## License

MIT
