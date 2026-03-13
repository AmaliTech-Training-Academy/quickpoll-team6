# QuickPoll Data Engineering — Team Integration Guide

> This document explains how the data engineering pipeline fits into the project
> and tells each teammate exactly what they need to know.

---

## What the Pipeline Does (Short Version)

Every time someone votes on a poll, creates a poll, or a user is added,
PostgreSQL triggers automatically compute analytics — vote counts, participation
rates, and voting trends. The results are stored in dedicated `analytics_*`
tables in the same database. The backend reads from those tables to serve
dashboard endpoints.

**The pipeline does not use Kafka.** It uses PostgreSQL triggers for real-time
analytics and a Python backfill process for startup reconciliation.

```
Backend writes a vote to the votes table
       ↓
PostgreSQL trigger fires (same transaction)
       ↓
Trigger function recomputes KPIs
       ↓
Analytics tables updated instantly
       ↓
Backend dashboard endpoints return fresh numbers
       ↓
Frontend dashboard displays live data
```

---

## Analytics Tables

These tables live in the shared `quickpoll` database.

| Table | What It Contains |
|---|---|
| `analytics_poll_summary` | Total votes, unique voters, participation rate — one row per poll |
| `analytics_option_breakdown` | Vote count and % share per option — one row per poll option |
| `analytics_votes_timeseries` | Votes bucketed by hour — powers trend charts |
| `analytics_user_participation` | Total votes cast, polls participated in — one row per user |

---

---

# FOR DEVOPS — Illiasu

> **This section explains the data engineering container and what it needs from
> the compose setup.**

---

## The Container

The `data-engineering/` folder has its own `Dockerfile`. The container runs a
Python process that:

1. Waits for PostgreSQL to be ready
2. Creates analytics tables if they do not exist
3. Deploys PL/pgSQL triggers from `schema_triggers.sql`
4. Runs a backfill to reconcile analytics with current OLTP state
5. Exits

After exit, PostgreSQL triggers handle all real-time analytics updates. The
container does not need to stay running.

---

## What the Service Needs in docker-compose

**Build path:** `./data-engineering`

**Service name:** `data-pipeline`
**Container name:** `qp-data-pipeline`

**Environment variables:**
```
ENVIRONMENT=local-dev
DB_HOST=postgres
DB_PORT=5432
DB_NAME=quickpoll
DB_USER=quickpoll
DB_PASSWORD=quickpoll123
LOG_LEVEL=INFO
DLQ_DIR=data/dlq
FORCE_FULL_BACKFILL=true
```

**Dependencies:** `postgres` with `condition: service_healthy` and `backend`
with `condition: service_started` (backend creates OLTP tables via Hibernate).

**No Kafka or Zookeeper required.**

---

## Confirming the Container Works

```bash
docker logs qp-data-pipeline
```

Expected output:
```
Waiting for PostgreSQL at postgres:5432...
PostgreSQL is ready.
Starting QuickPoll analytics pipeline...
```

The container will run backfill and then exit with code 0.

---

---

# FOR BACKEND — Abdul Basit

> **The analytics pipeline uses PostgreSQL triggers — not Kafka. You do not need
> to publish any events. Just write to your OLTP tables normally and the triggers
> will handle the rest.**

---

## How It Works

When your backend writes to `votes`, `polls`, `users`, or `poll_options`,
PL/pgSQL triggers fire automatically and update the analytics tables. This
happens in the same database transaction — no external message broker needed.

## Dashboard Endpoints

The backend should read from `analytics_*` tables for dashboard endpoints. See
`BACKEND_DASHBOARD_IMPLEMENTATION_HANDOFF.md` for the full specification of
what endpoints to implement and how to query the analytics tables.

Key endpoints:
- `GET /dashboard/summary` — reads from `analytics_poll_summary`
- `GET /dashboard/active-polls` — reads from `analytics_poll_summary`
- `GET /dashboard/recent-results` — reads from `analytics_poll_summary` +
  `analytics_option_breakdown`
- `GET /dashboard/top-users` — reads from `analytics_user_participation`
- `GET /polls/{id}/results` — reads from `analytics_poll_summary` +
  `analytics_option_breakdown`
- `GET /polls/{id}/results/timeseries` — reads from
  `analytics_votes_timeseries`

---

---

# FOR FRONTEND — Jude

> **The analytics tables are populated by PostgreSQL triggers in real time. The
> backend exposes dashboard endpoints that read from those tables. You consume
> those endpoints — never query analytics tables directly.**

---

## Dashboard Endpoints to Consume

See `FRONTEND_DASHBOARD_ANGULAR_HANDOFF.md` for the full specification including
TypeScript interfaces, Angular service methods, and component implementation
guides.

Key endpoints:
- `GET /dashboard/summary` — KPI cards
- `GET /dashboard/active-polls` — active polls table
- `GET /dashboard/recent-results` — recent results with winning option
- `GET /dashboard/top-users` — admin-only leaderboard
- `GET /polls/{id}/results` — single poll analytics (bar chart, pie chart)
- `GET /polls/{id}/results/timeseries` — voting trend chart

## Data Freshness

Analytics update within the same database transaction as the OLTP write. When a
user votes and the page refreshes, the dashboard will reflect the new data
immediately.

---

---

# FOR QA — Samuel

> **This section explains how to validate the analytics pipeline.**

---

## How to Validate

### 1 — Container Startup

```bash
docker-compose up
docker logs qp-data-pipeline
```

Expected: container starts, runs backfill, exits with code 0.

### 2 — Vote Triggers Analytics Update

1. Log in and cast a vote on any poll
2. Query the database immediately:

```sql
SELECT poll_id, total_votes, participation_rate, last_updated
FROM analytics_poll_summary
WHERE poll_id = <the poll you voted on>;
```

**Pass condition:** `total_votes` incremented by 1 and `last_updated` reflects
a recent timestamp.

### 3 — Option Breakdown Percentages

After several votes on the same poll:

```sql
SELECT option_text, vote_count, vote_percentage
FROM analytics_option_breakdown
WHERE poll_id = <any active poll>;
```

**Pass condition:** `vote_percentage` values sum to approximately 100.

### 4 — Distinguishing Pipeline Bugs from App Bugs

If the dashboard shows wrong numbers:

1. Query `analytics_poll_summary` directly — are the numbers correct there?
2. If analytics tables are correct but UI is wrong → frontend/backend bug
3. If analytics tables are wrong → trigger bug (report to data engineering)
4. If analytics tables are empty → backfill did not run (check container logs)

### Commands for Checking

```bash
# Check container ran successfully
docker logs qp-data-pipeline

# Connect to database
docker exec -it qp-postgres psql -U quickpoll -d quickpoll

# Check analytics tables
\dt analytics_*
SELECT * FROM analytics_poll_summary;
SELECT * FROM analytics_option_breakdown WHERE poll_id = 1;
SELECT * FROM analytics_votes_timeseries ORDER BY recorded_at DESC LIMIT 20;
SELECT * FROM analytics_user_participation;
```

---

## Questions?

If you have any questions about the pipeline or need something, reach out
directly.
