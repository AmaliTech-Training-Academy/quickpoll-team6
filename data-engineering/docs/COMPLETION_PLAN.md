# QuickPoll Team 6 -- Full Completion Plan

**Author:** Henry Nana Antwi
**Date:** March 13, 2026

---

## Current State Summary

The project was roughly 75% complete. The backend was mostly done, the
data-engineering pipeline was functional, and the frontend had core features but
was missing the analytics dashboard and had several incomplete components.

### What Was Already Working

- **Backend**: Auth, Poll CRUD, Voting, Dashboard/Analytics endpoints, Poll
  expiration scheduler
- **Data Engineering**: Analytics pipeline (triggers + backfill), seed scripts,
  analytics tables, Dockerfile
- **Frontend**: Login, Register, Poll List, Create Poll, Poll Metrics (partial),
  Profile
- **Dockerfiles**: All three sub-components had Dockerfiles

### What Was Missing or Broken

**Docker Infrastructure:**
- Root `docker-compose.yml` still referenced Kafka (removed)
- No Postgres in root compose
- Frontend `API_BASE_URL` hardcoded to AWS ALB
- Backend CORS missing Docker origins

**Backend:**
- `ddl-auto: create-drop` destroys data on every restart
- CORS only allows localhost and ngrok
- Vote unique constraint breaks multi-select polls

**Frontend:**
- `DashboardComponent` not created
- `DashboardService` not created
- `PollDetailsComponent` was a placeholder
- Timeseries trend chart not wired
- `CreatedPollListComponent` used wrong endpoint
- 409 vote error not handled
- Status chip not implemented
- Dashboard nav link missing

---

## Architecture After Completion

```
                         Docker Compose Stack
+--------------------------------------------------------------------+
|                                                                    |
|  Angular Frontend (:4200)  --/api proxy-->  Spring Boot (:8080)   |
|         nginx                                    |                 |
|                                          reads/writes              |
|                                                  v                 |
|                                         PostgreSQL (:5432)         |
|                                           OLTP + Analytics         |
|                                           PL/pgSQL Triggers        |
|                                                  ^                 |
|  Data-Engineering (Python) ---- backfill --------+                 |
|    (runs once, deploys triggers, exits)                            |
+--------------------------------------------------------------------+
```

Frontend nginx reverse-proxies `/api/*` requests to the backend container,
eliminating CORS issues entirely in Docker.

---

## Task Breakdown (Completed)

### Task 1: Docker Infrastructure (Root)

**Files modified:** `docker-compose.yml`

- Rewrote `docker-compose.yml` with 4 services: postgres, backend, frontend,
  data-pipeline
- Removed all Kafka/Zookeeper references
- Added Postgres with healthcheck, volume persistence, schema init
- Configured environment variables for all services
- Frontend now listens on port 80 (nginx), mapped to host port 4200

### Task 2: Backend Configuration Fixes

**Files modified:** `backend/src/main/resources/application.yml`,
`backend/.../SecurityConfig.java`, `backend/.../Vote.java`

- Changed `ddl-auto` from `create-drop` to `${SPRING_JPA_HIBERNATE_DDL_AUTO:update}`
- Added Docker-friendly CORS origins (`http://quickpoll-frontend`,
  `http://quickpoll-frontend:80`)
- Fixed Vote unique constraint from `(poll_id, user_id)` to
  `(poll_id, user_id, option_id)` for multi-select support

### Task 3: Frontend -- Analytics Dashboard Page

**Files created:** `frontend/src/app/services/dashboard.service.ts`,
`frontend/src/app/pages/dashboard.component.ts`

**Files modified:** `frontend/src/app/models.ts`,
`frontend/src/app/app.routes.ts`

- Added dashboard types: `PageResponse<T>`, `DashboardSummary`,
  `ActivePollItem`, `WinningOption`, `RecentResultItem`, `TopUser`
- Created `DashboardService` with getSummary, getActivePolls, getRecentResults,
  getTopUsers methods
- Created `DashboardComponent` with KPI cards, active polls table, recent
  results grid, admin-only top users leaderboard
- Added `~/dashboard` route under authenticated layout

### Task 4: Frontend -- Poll Metrics Enhancement

**Files modified:** `frontend/src/app/services/poll.service.ts`,
`frontend/src/app/pages/poll-metrics.component.ts`

- Added `getResultsTimeseries()` method to PollService
- Added area trend chart using `angular-chrts` AreaChartComponent
- Polished layout to match reference image (2-column grid with info card, KPI
  cards, donut chart, bar chart, full-width trend chart)
- Removed console.log/console.error statements
- Added loading skeleton and error states

### Task 5: Frontend -- Bug Fixes and Polish

**Files modified:** `frontend/src/app/pages/poll-details.component.ts`,
`frontend/src/app/pages/created-poll-list.component.ts`,
`frontend/src/app/components/ui/poll-card.component.ts`,
`frontend/src/app/components/layout/layout.component.ts`,
`frontend/src/app/constants.ts`

- Implemented `PollDetailsComponent` with poll info, metadata, options list
- Fixed `CreatedPollListComponent` to use `getUserCreatedPolls()` instead of
  `getAll()`
- Added 409 error handling in poll card ("You have already voted on this poll")
- Added status chip (ACTIVE/CLOSED badge) to poll cards
- Added "Dashboard" link to the main navigation bar
- Changed `API_BASE_URL` from hardcoded AWS URL to dynamic
  `(window as any).__env?.API_BASE_URL || '/api'`

### Task 6: Frontend Docker/Nginx Configuration

**Files modified:** `frontend/nginx.conf`, `frontend/Dockerfile`

- Added `/api/` reverse proxy block in nginx pointing to
  `http://quickpoll-backend:8080/api/`
- Changed nginx listen port from 8080 to 80
- Updated Dockerfile EXPOSE from 8080 to 80
- Added proxy headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)

### Task 7: Data Engineering -- Documentation Updates

**Files modified:** `data-engineering/docs/PIPELINE_ARCHITECTURE.md`,
`data-engineering/docs/TEAM_INTEGRATION_GUIDE.md`

- Rewrote `PIPELINE_ARCHITECTURE.md` to reflect trigger-based architecture
  (removed all Kafka references, updated diagrams, updated file structure)
- Rewrote `TEAM_INTEGRATION_GUIDE.md` for all team roles (DevOps, Backend,
  Frontend, QA) to reflect trigger-based architecture
- Verified `entrypoint.sh` and `.env.example` are Kafka-free

---

## File Ownership Matrix

| Task | Files |
|------|-------|
| Task 1 | `docker-compose.yml` |
| Task 2 | `backend/.../application.yml`, `backend/.../SecurityConfig.java`, `backend/.../Vote.java` |
| Task 3 | `frontend/.../dashboard.service.ts`, `frontend/.../dashboard.component.ts`, `frontend/.../models.ts`, `frontend/.../app.routes.ts` |
| Task 4 | `frontend/.../poll.service.ts`, `frontend/.../poll-metrics.component.ts` |
| Task 5 | `frontend/.../poll-details.component.ts`, `frontend/.../created-poll-list.component.ts`, `frontend/.../poll-card.component.ts`, `frontend/.../layout.component.ts`, `frontend/.../constants.ts` |
| Task 6 | `frontend/nginx.conf`, `frontend/Dockerfile` |
| Task 7 | `data-engineering/docs/PIPELINE_ARCHITECTURE.md`, `data-engineering/docs/TEAM_INTEGRATION_GUIDE.md` |

---

## Verification Steps

1. Run `docker-compose up --build` from root
2. Wait for all services to be healthy (backend, frontend, data-pipeline)
3. Open `http://localhost:4200`
4. Login with `admin@amalitech.com / password123`
5. Verify: Poll list loads, create poll works, vote works
6. Navigate to Dashboard -- verify KPI cards, active polls, recent results
7. Navigate to a poll's metrics page -- verify charts and trend data
8. Login with `user@amalitech.com / password123`
9. Verify: Participant view works correctly
