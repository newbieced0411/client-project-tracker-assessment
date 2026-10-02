# Folio — Client Project Tracker

A focused full-stack project tracker for digital agencies. Folio gives project managers a fast, clear way to create, update, find, filter, sort, and remove client engagements.

This submission implements the complete CRUD brief plus the optional search, status filtering, priority filtering, sorting, automated tests, and Docker setup.

## Stack

- **Frontend:** React 19, TypeScript, Vite, responsive custom CSS
- **Backend:** Node.js, Express 5, TypeScript, Zod validation
- **Database:** SQLite through Node's built-in `node:sqlite` module
- **Tests:** Vitest and Supertest

The app uses a small monorepo. `apps/client` owns the browser experience; `apps/server` owns validation, persistence, and the REST API. The repository layer keeps SQLite details separate from HTTP concerns, and a shared schema at the API boundary provides consistent, meaningful errors.

## Run locally

Prerequisites: Node.js 24+ and pnpm 10+.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The frontend development server proxies `/api` requests to the API at `http://localhost:3001`.

The SQLite database is created automatically at `data/projects.db` and seeded on first launch. To configure it, copy `.env.example` values into your shell environment.

## Verify the submission

```bash
pnpm test
pnpm build
```

The integration suite covers listing/filtering, the full create-read-update-delete lifecycle, not-found responses, and field-level validation failures.

## Docker

```bash
docker compose up --build
```

The complete application will be available at `http://localhost:3001`. The compose file persists SQLite data in a named volume.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/projects` | List projects; accepts `search`, `status`, `priority`, and `sort` |
| `GET` | `/api/projects/:id` | Get one project |
| `POST` | `/api/projects` | Create a project |
| `PUT` | `/api/projects/:id` | Replace a project |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `GET` | `/api/health` | Health check |

Every write validates required names, allowed status and priority values, ISO date shape, and that the due date is not earlier than the start date. Invalid input returns HTTP `422` with field-level details. Missing resources return HTTP `404`.

## Technical reflection

### Architecture decisions

I chose a small TypeScript monorepo so frontend and backend can evolve independently while sharing one setup. Express makes the REST contract immediately familiar, Zod keeps validation declarative, and SQLite makes the submission genuinely persistent without asking a reviewer to provision infrastructure. A repository class isolates persistence, leaving route handlers focused on HTTP behavior.

I intentionally kept authentication out of scope and invested that time in the core workflow, accessible interaction states, useful filtering, test coverage, and clear failure handling. The UI is responsive from mobile through desktop, uses semantic controls, and preserves visible labels and keyboard focus states.

### Trade-offs and next steps

SQLite is an excellent zero-configuration choice for this assessment, but a multi-instance production deployment would move to PostgreSQL and add migrations. At larger scale I would also add cursor pagination, structured request logging, rate limiting, optimistic frontend updates, and end-to-end browser tests. Authentication would introduce per-user or per-workspace authorization at the repository boundary.

### AI disclosure

OpenAI Codex was used as a development assistant for implementation, test generation, documentation, and UI refinement. The final architecture, requirements coverage, and behavior were reviewed and verified as part of the submission workflow.
