# QuickPoll Analytics Pipeline — User Guide

**Author:** Henry Nana Antwi — Data Engineer, Team 6  
**Project:** QuickPoll — AmaliTech Phase 1 Capstone

---

## Table of Contents

1. [What This Pipeline Does](#1-what-this-pipeline-does)
2. [Prerequisites](#2-prerequisites)
3. [Scenario A: Local Setup with Docker Postgres](#3-scenario-a-local-setup-with-docker-postgres)
4. [Scenario B: Shared Remote DB (Backend's Postgres)](#4-scenario-b-shared-remote-db-backends-postgres)
5. [Seeding Test Data](#5-seeding-test-data)
6. [Running the Pipeline](#6-running-the-pipeline)
7. [Verifying the Analytics Tables](#7-verifying-the-analytics-tables)
8. [Environment Variable Reference](#8-environment-variable-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. What This Pipeline Does

The QuickPoll analytics pipeline is a **run-to-completion** Python service that:

1. **Creates tables** — Ensures all four analytics tables exist (`poll_summary`, `option_breakdown`, `votes_timeseries`, `user_participation`).
2. **Deploys triggers** — Installs five PL/pgSQL trigger functions onto the shared PostgreSQL database. These triggers automatically update analytics whenever a vote, poll, or user is inserted or updated.
3. **Backfills** — Runs an incremental (or full) backfill to compute analytics for all historical data that existed before the triggers were installed.
4. **Exits** — After setup completes, the container exits cleanly. All future analytics updates are handled by the live database triggers — no long-running process is needed.

```
                    ┌──────────────────────────────┐
  On startup        │  deploy_triggers()            │
                    │  create_analytics_tables()    │
                    │  run_backfill()               │
                    │  exit                         │
                    └──────────────────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────────┐
  On every INSERT   │  PostgreSQL Trigger Functions │──► Analytics Tables
  or UPDATE         │  (live, in-DB, always on)     │
                    └──────────────────────────────┘
```

---

## 2. Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://www.python.org/downloads/) |
| uv | latest | [astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/) |
| Docker Desktop | 20+ | [docker.com](https://docs.docker.com/get-docker/) |
| PostgreSQL client (`psql`) | 14+ | Bundled with Docker image; or install via pgAdmin/Homebrew |

No Kafka or Zookeeper are required.

---

## 3. Scenario A: Local Setup with Docker Postgres

Use this scenario when you want a fully self-contained local environment with no dependency on the shared backend database.

### Step 1: Install dependencies

```powershell
cd data-engineering
uv sync
```

### Step 2: Create your `.env` file

```powershell
cp .env.example .env
```

Open `.env`. The defaults work out of the box for local Docker:

```env
ENVIRONMENT=local-dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quickpoll
DB_USER=quickpoll
DB_PASSWORD=quickpoll123
LOG_LEVEL=DEBUG
```

### Step 3: Start the local Postgres container

```powershell
docker compose -f docker-compose.local.yml up -d postgres
```

This starts a PostgreSQL 17 container and runs `schema.sql` automatically to create the OLTP tables.

Verify it's up:

```powershell
docker compose -f docker-compose.local.yml ps
```

### Step 4: Seed test data (optional but recommended)

```powershell
uv run python scripts/seed_data.py
```

This inserts 7 users, 10 polls, options, and votes so the backfill has data to process.

### Step 5: Run the pipeline

```powershell
uv run python main.py
```

Or with rav:

```powershell
rav x run
```

You should see logs like:

```
INFO  Analytics tables ensured.
INFO  Trigger functions deployed to PostgreSQL.
INFO  Backfill complete for polls: 10 processed.
INFO  Backfill complete for votes: 47 processed.
INFO  Initial backfill complete. Pipeline setup finished.
```

The process exits after setup. The triggers remain installed in Postgres.

---

## 4. Scenario B: Shared Remote DB (Backend's Postgres)

Use this scenario to point the pipeline at the **same database the Spring Boot backend uses**. This is the intended production setup: triggers fire whenever the backend inserts votes, polls, or users.

### Step 1: Install dependencies

```powershell
cd data-engineering
uv sync
```

### Step 2: Get the backend's DB credentials

Ask the backend team (or DevOps) for:

- `DB_HOST` — hostname of the managed Postgres instance
- `DB_PORT` — typically `5432` (local Docker) or `25060` (Digital Ocean managed Postgres)
- `DB_NAME` — usually `quickpoll` or `defaultdb`
- `DB_USER` — usually `doadmin` or `quickpoll`
- `DB_PASSWORD` — the database password

### Step 3: Create your `.env` file

```powershell
cp .env.example .env
```

Edit `.env` with the backend's credentials:

```env
ENVIRONMENT=staging
DB_HOST=your-postgres-host.db.ondigitalocean.com
DB_PORT=25060
DB_NAME=quickpoll
DB_USER=doadmin
DB_PASSWORD=<backend-db-password>
LOG_LEVEL=INFO
```

> **Note:** When `ENVIRONMENT=staging`, all DB vars are **required** — the pipeline will fail fast if any are missing.

### Step 4: Verify connectivity

```powershell
uv run python -c "from data_engineering.config import get_engine; e = get_engine(); e.connect().close(); print('Connected OK')"
```

### Step 5: Run the pipeline

```powershell
uv run python main.py
```

The pipeline deploys the trigger functions directly onto the backend's database and runs the initial backfill. The pipeline then exits. From this point on:

- Every `INSERT INTO votes` → triggers fire → `poll_summary`, `option_breakdown`, `votes_timeseries`, `user_participation` update instantly
- Every `INSERT INTO polls` → triggers fire → `poll_summary` updates
- Every `INSERT INTO users` → triggers fire → `user_participation` updates

No pipeline process needs to stay running.

---

## 5. Seeding Test Data

Four scripts are available to populate the OLTP tables with test data (local only — do not seed a shared remote DB).

### Static seed data (fast, no API key needed)

```powershell
rav x seed
# or: uv run python scripts/seed_data.py
```

Creates 7 users, 10 polls (including edge cases: zero votes, expired polls, high participation), options, and votes. Uses `ON CONFLICT DO NOTHING` so it is safe to run multiple times.

### AI-generated data (realistic, requires GROQ_API_KEY)

```powershell
# Set GROQ_API_KEY in .env first, then:
rav x seed-ai
```

Uses Groq LLMs (default: `llama-3.1-8b-instant`) to generate realistic poll questions, options, and voting patterns. Good for testing the full dashboard experience.

```powershell
# Larger dataset (10 chunks ≈ 50-80 polls)
rav x seed-ai-small-10

# Use the stronger 70B model for higher quality output
rav x seed-ai-70b
```

---

## 6. Running the Pipeline

### Normal run (incremental backfill)

```powershell
uv run python main.py
```

On first run: full backfill (no watermarks exist yet).  
On subsequent runs: incremental backfill (only processes records newer than the last watermark).

### Force full re-backfill

```powershell
rav x backfill-full
# or: $env:FORCE_FULL_BACKFILL = "true"; uv run python main.py
```

Use this after schema changes, data corrections, or to reset the analytics tables from scratch.

### Run in Docker

```powershell
docker compose -f docker-compose.local.yml up
```

This builds the pipeline image and runs it against the local Postgres container. The data-pipeline container waits for Postgres to be healthy before starting.

---

## 7. Verifying the Analytics Tables

After the pipeline runs, check that the analytics tables were populated.

### Using psql (local Docker)

```bash
psql -h localhost -p 5432 -U quickpoll -d quickpoll
```

```sql
-- Overall vote counts per poll
SELECT * FROM poll_summary LIMIT 10;

-- Per-option breakdown
SELECT * FROM option_breakdown LIMIT 10;

-- Hourly vote time-series
SELECT * FROM votes_timeseries ORDER BY bucket_start DESC LIMIT 20;

-- User participation metrics
SELECT * FROM user_participation LIMIT 10;
```

### Verify triggers are installed

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

Expected output:

| trigger_name | event_manipulation | event_object_table |
|---|---|---|
| trg_poll_after_insert | INSERT | polls |
| trg_poll_after_update | UPDATE | polls |
| trg_user_after_insert | INSERT | users |
| trg_vote_after_insert | INSERT | votes |

### Using psql (remote staging DB)

```bash
psql "postgresql://doadmin:<password>@your-host.db.ondigitalocean.com:25060/quickpoll?sslmode=require"
```

Then run the same SQL queries above.

---

## 8. Environment Variable Reference

All configuration is via environment variables. Copy `.env.example` to `.env`.

### Database

| Variable | Default (`local-dev`) | Required in `staging` | Description |
|----------|-----------------------|-----------------------|-------------|
| `ENVIRONMENT` | `local-dev` | — | `local-dev` or `staging` |
| `DB_HOST` | `localhost` | ✅ | PostgreSQL host |
| `DB_PORT` | `5432` | ✅ | PostgreSQL port |
| `DB_NAME` | `quickpoll` | ✅ | Database name |
| `DB_USER` | `quickpoll` | ✅ | Database user |
| `DB_PASSWORD` | `quickpoll123` | ✅ | Database password |

### Pipeline behaviour

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `BACKFILL_INTERVAL_MINUTES` | `30` | Overlap window for incremental backfill watermark |
| `WATERMARK_OVERLAP_MINUTES` | `5` | Minutes subtracted from watermark to guard against clock skew |
| `FORCE_FULL_BACKFILL` | `false` | Set `true` to ignore watermarks and re-process everything |

### Dead-Letter Queue

Failed events during backfill are written to a local folder (`local-dev`) or Cloudflare R2 (`staging`).

| Variable | Default | Description |
|----------|---------|-------------|
| `DLQ_DIR` | `data/dlq` | Local folder for failed events (`local-dev` only) |
| `R2_ENDPOINT_URL` | `""` | `https://<account-id>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | `""` | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | `""` | R2 API secret key |
| `R2_DLQ_BUCKET` | `quickpoll-dlq` | R2 bucket name |

### AI Seeding (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | `""` | Required for `seed_ai_oltp.py` |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Primary LLM model |
| `GROQ_FALLBACK_MODEL` | `llama-3.3-70b-versatile` | Fallback model |

---

## 9. Troubleshooting

### `connection refused` on startup

Postgres is not running or not yet healthy.

```powershell
# Check container status
docker compose -f docker-compose.local.yml ps

# Restart Postgres
docker compose -f docker-compose.local.yml restart postgres

# View Postgres logs
docker compose -f docker-compose.local.yml logs postgres
```

### `role "quickpoll" does not exist`

The database was not initialized with `schema.sql`.

```powershell
# Nuke and recreate the Postgres volume
docker compose -f docker-compose.local.yml down -v
docker compose -f docker-compose.local.yml up -d postgres
```

### Analytics tables are empty after run

1. Check that seed data was inserted: `SELECT COUNT(*) FROM votes;`
2. Confirm the backfill ran: look for `Backfill complete` in logs
3. Force a full re-run: `rav x backfill-full`

### Triggers are not firing on new inserts

Verify triggers are installed on the correct database:

```sql
SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';
```

If missing, re-run the pipeline (`uv run python main.py`) — `deploy_triggers()` is idempotent.

### `staging` mode fails with missing variable error

When `ENVIRONMENT=staging`, all DB vars are required. Check your `.env`:

```powershell
# List all set env vars
cat .env
```

Ensure `DB_HOST`, `DB_USER`, `DB_PASSWORD` are all set (no angle brackets like `<placeholder>`).

### Running unit tests

```powershell
cd data-engineering
.\.venv\Scripts\activate
python -m pytest tests/unit/ -q
```

All tests use mocks — no live database needed.
