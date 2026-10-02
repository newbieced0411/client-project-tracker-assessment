# Folio — Client Project Tracker

A focused full-stack project tracker for digital agencies. Folio gives project managers a fast, clear way to create, update, find, filter, sort, and remove client engagements.

This submission implements the complete CRUD brief plus project subtasks, search, status filtering, priority filtering, sorting, automated tests, and Docker setup.

## Features Implemented

- Create, view, edit, and delete client projects
- Required-field, enum, and cross-field date validation with meaningful API errors
- Search across projects, clients, and descriptions
- Filter by status and priority; sort by date, name, and priority
- Create, edit, complete, reopen, and delete subtasks within each project
- Live project-level subtask progress (`completed / total`)
- Responsive, keyboard-friendly interface with loading, empty, error, and confirmation states
- Persistent SQLite storage with cascading project/subtask deletion
- REST integration tests and a production Docker build

## Stack

- **Frontend:** React 19, TypeScript, Vite, responsive custom CSS
- **Backend:** Node.js, Express 5, TypeScript, Zod validation
- **Database:** SQLite through Node's built-in `node:sqlite` module
- **Tests:** Vitest and Supertest

The app uses a small monorepo. `apps/client` owns the browser experience; `apps/server` owns validation, persistence, and the REST API. The repository layer keeps SQLite details separate from HTTP concerns, and a shared schema at the API boundary provides consistent, meaningful errors.

## Setup Instructions

Prerequisites: Node.js 24+ and pnpm 10+.

### Windows quick start

Double-click `start-dev.cmd`, wait until both services report that they are ready, then open [http://localhost:5173](http://localhost:5173). Keep the command window open while using the application.

Do not open `apps/client/index.html` directly. It is source code for Vite and will not work from a `file://` URL because the frontend needs compilation and the backend API must be running.

### Command line

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

The integration suite covers listing/filtering, project and subtask CRUD, progress totals, not-found responses, and field-level validation failures.

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
| `GET` | `/api/projects/:id/subtasks` | List a project's subtasks |
| `POST` | `/api/projects/:id/subtasks` | Create a subtask |
| `PUT` | `/api/subtasks/:id` | Edit or complete a subtask |
| `DELETE` | `/api/subtasks/:id` | Delete a subtask |
| `GET` | `/api/health` | Health check |

Every write validates required names, allowed status and priority values, ISO date shape, and that the project due date is not earlier than its start date. Invalid input returns HTTP `422` with field-level details. Missing resources return HTTP `404`.

## Assumptions Made

- A project belongs to one agency workspace; authentication and multi-tenancy are outside the assessment scope.
- Project status and priority use only the values defined in `REQUIREMENTS.md`.
- Dates are stored as ISO calendar dates (`YYYY-MM-DD`) without a time zone because the brief asks for dates, not appointments.
- Subtasks are an optional enhancement owned by exactly one project. Deleting a project deletes its subtasks through a database foreign key.
- Subtask due dates are optional and independent of the project's date range so teams can capture follow-up work without losing it.
- The supplied sample data is used as first-run seed data; subsequent changes persist locally in SQLite.

## Technical reflection

### Architecture decisions

I chose a small TypeScript monorepo so frontend and backend can evolve independently while sharing one setup. Express makes the REST contract immediately familiar, Zod keeps validation declarative, and SQLite makes the submission genuinely persistent without asking a reviewer to provision infrastructure. A repository class isolates persistence, leaving route handlers focused on HTTP behavior.

I intentionally kept authentication out of scope and invested that time in the core workflow, accessible interaction states, useful filtering, test coverage, and clear failure handling. The UI is responsive from mobile through desktop, uses semantic controls, and preserves visible labels and keyboard focus states.

### Trade-offs and next steps

SQLite is an excellent zero-configuration choice for this assessment, but a multi-instance production deployment would move to PostgreSQL and add migrations. At larger scale I would also add cursor pagination, structured request logging, rate limiting, optimistic frontend updates, and end-to-end browser tests. Authentication would introduce per-user or per-workspace authorization at the repository boundary.

### AI disclosure

OpenAI Codex was used as a development assistant for implementation, test generation, documentation, and UI refinement. The final architecture, requirements coverage, and behavior were reviewed and verified as part of the submission workflow.
