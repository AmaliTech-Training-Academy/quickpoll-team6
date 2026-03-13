# QuickPoll Real-Time Data Pipeline Architecture

**Author:** Henry Nana Antwi — Data Engineer, Team 6  
**Project:** QuickPoll — AmaliTech Phase 1 Capstone  
**Date:** March 2026

---

## 1. Overview

This document describes the analytics pipeline for QuickPoll. The pipeline uses
**PostgreSQL triggers** as the real-time event mechanism. When the backend writes
to OLTP tables (votes, polls, users, poll_options), PL/pgSQL trigger functions
fire and update the analytics tables in the same transaction. A Python backfill
process runs on startup to reconcile any gaps.

> **Historical note:** The pipeline originally used Apache Kafka as the event
> backbone. Kafka was removed in favour of PostgreSQL triggers to simplify the
> infrastructure and eliminate the need for a separate message broker. See
> `KAFKA_TO_TRIGGERS_MIGRATION.md` for migration details.

---

## 2. System-Level Architecture

The full system runs inside Docker Compose. All services share one Docker
network. External traffic reaches the frontend on port 4200 and the backend REST
API on port 8080. PostgreSQL is internal only.

```
                         Docker Compose Stack
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌────────────────┐    /api proxy   ┌───────────────────────┐     │
│  │   Angular      │ ───────────────►│  Spring Boot Backend  │     │
│  │   Frontend     │                 │        :8080          │     │
│  │   :4200 (nginx)│                 └──────────┬────────────┘     │
│  └────────────────┘                            │                  │
│                                     reads/writes│                  │
│                                                ▼                  │
│                                    ┌────────────────┐             │
│                                    │  PostgreSQL    │             │
│                                    │    :5432       │             │
│                                    │                │             │
│                                    │  ┌──────────┐ │             │
│                                    │  │  OLTP    │ │             │
│                                    │  │  Tables  │ │             │
│                                    │  ├──────────┤ │             │
│  ┌─────────────────────┐           │  │Analytics │ │             │
│  │  Data Engineering   │──────────►│  │  Tables  │ │             │
│  │  Python (backfill)  │           │  └──────────┘ │             │
│  └─────────────────────┘           │                │             │
│                                    │  PL/pgSQL     │             │
│                                    │  Triggers ────┘             │
│                                    └────────────────┘             │
└────────────────────────────────────────────────────────────────────┘
```

**Service responsibilities:**

- **Angular Frontend** — serves the UI; proxies `/api` requests to backend via
  nginx
- **Spring Boot Backend** — handles all user-facing API requests; writes to OLTP
  tables; reads from analytics tables for dashboard endpoints
- **PostgreSQL** — single database holding both OLTP tables (backend-owned) and
  analytics tables (data-engineering-owned); PL/pgSQL triggers keep analytics
  tables in sync in real time
- **Data Engineering** — runs once on startup to deploy triggers and backfill
  analytics tables; then exits

---

## 3. Real-Time Analytics via Triggers

Instead of an external event bus, the pipeline uses PostgreSQL triggers defined
in `schema_triggers.sql`. These fire on INSERT, UPDATE, and DELETE operations
on OLTP tables.

### Trigger Coverage

| OLTP Table | Trigger Events | Analytics Tables Updated |
|---|---|---|
| `votes` | INSERT | `analytics_poll_summary`, `analytics_option_breakdown`, `analytics_votes_timeseries`, `analytics_user_participation` |
| `polls` | INSERT, UPDATE, DELETE | `analytics_poll_summary`, `analytics_user_participation` |
| `users` | INSERT, UPDATE | `analytics_poll_summary` (participation rate), `analytics_user_participation` |
| `poll_options` | INSERT, UPDATE, DELETE | `analytics_option_breakdown` |

### How It Works

1. Backend saves a vote to the `votes` table
2. The `trg_vote_insert` trigger fires within the same transaction
3. The trigger function recomputes poll summary, option breakdown, timeseries
   bucket, and voter participation
4. All analytics updates are part of the same transaction — if the vote insert
   fails, the analytics update is rolled back too

This gives **zero-latency** analytics updates with transactional consistency.

---

## 4. Backfill Pipeline (Python)

The Python data-engineering container runs on startup and performs:

1. **Create analytics tables** — ensures all analytics tables exist
2. **Deploy triggers** — executes `schema_triggers.sql` to install/update
   trigger functions
3. **Run backfill** — reconciles analytics tables with current OLTP state

### Backfill Modes

- **Full backfill** — recomputes all analytics from scratch; used on first run
  or when `FORCE_FULL_BACKFILL=true`
- **Incremental backfill** — uses watermarks to only process changes since last
  run; used on subsequent startups

After backfill completes, the container exits. Triggers handle all subsequent
real-time updates.

---

## 5. Analytics Tables

These tables live in the same `quickpoll` PostgreSQL database.

### `analytics_poll_summary`

One row per poll. Updated by triggers on every vote and poll change.

| Column | Type | Description |
|---|---|---|
| poll_id | BIGINT PK | Foreign key to polls |
| creator_id | BIGINT | Creator user ID |
| title | VARCHAR | Poll title |
| description | TEXT | Poll description |
| creator_name | VARCHAR | Name of poll creator |
| status | VARCHAR | ACTIVE / CLOSED |
| max_selections | INT | Maximum selections allowed |
| total_votes | INT | Total votes cast on this poll |
| unique_voters | INT | Distinct users who voted |
| participation_rate | FLOAT | unique_voters / total_registered_users |
| expires_at | TIMESTAMPTZ | Poll expiration time |
| created_at | TIMESTAMPTZ | When the poll was created |
| last_updated | TIMESTAMPTZ | When this analytics row was last computed |

### `analytics_option_breakdown`

One row per poll option. Shows vote distribution.

| Column | Type | Description |
|---|---|---|
| option_id | BIGINT PK | FK to poll_options |
| poll_id | BIGINT | FK to polls |
| option_text | VARCHAR | The option label |
| vote_count | INT | Votes for this option |
| vote_percentage | FLOAT | vote_count / total_votes for this poll |
| last_updated | TIMESTAMPTZ | When last computed |

### `analytics_votes_timeseries`

Append-only. One row per poll per hour bucket. Powers trend charts.

| Column | Type | Description |
|---|---|---|
| id | SERIAL PK | Auto-increment |
| poll_id | BIGINT | FK to polls |
| bucket_time | TIMESTAMPTZ | Hour bucket (truncated to hour) |
| votes_in_bucket | INT | Votes cast in this hour |
| recorded_at | TIMESTAMPTZ | When this row was inserted |

### `analytics_user_participation`

One row per user. Tracks engagement.

| Column | Type | Description |
|---|---|---|
| user_id | BIGINT PK | FK to users |
| user_name | VARCHAR | Display name |
| total_votes_cast | INT | Total votes by this user |
| polls_participated | INT | Number of distinct polls voted on |
| polls_created | INT | Polls created by this user |
| last_active | TIMESTAMPTZ | Most recent vote timestamp |
| last_updated | TIMESTAMPTZ | When last computed |

---

## 6. Docker Compose Setup

The root `docker-compose.yml` defines four services:

```yaml
services:
  postgres:    # PostgreSQL 17 with healthcheck
  backend:     # Spring Boot, depends on postgres
  frontend:    # Angular + nginx, proxies /api to backend
  data-pipeline: # Python backfill, depends on postgres + backend
```

The data-pipeline container:
- Waits for PostgreSQL readiness via `entrypoint.sh`
- Deploys triggers and runs backfill
- Exits after completion (triggers continue working in PostgreSQL)

---

## 7. KPIs Computed by the Pipeline

| KPI | Description | Source Table |
|---|---|---|
| Total votes per poll | Aggregate vote count | `analytics_poll_summary.total_votes` |
| Participation rate | % of registered users who voted on a poll | `analytics_poll_summary.participation_rate` |
| Vote distribution per option | % share of each option | `analytics_option_breakdown.vote_percentage` |
| Hourly voting trend | Votes bucketed by hour | `analytics_votes_timeseries` |
| Most active users | Users with highest vote counts | `analytics_user_participation` |
| Active vs closed polls | Count by status | Derived from `analytics_poll_summary.status` |

---

## 8. Error Handling & Reliability

| Concern | Approach |
|---|---|
| Trigger failure | Runs inside the same transaction as the OLTP write — both succeed or both roll back |
| Backfill crash | Container restarts; backfill is idempotent (uses UPSERT) |
| Schema drift | Triggers use `IF NOT EXISTS` and `ALTER COLUMN` for compatibility |
| Bad data | Trigger functions handle NULL values and edge cases gracefully |
| Missing analytics rows | Full backfill on startup reconciles any gaps |

---

## 9. File Structure

```
data-engineering/
├── main.py                    # Entry point: create tables → deploy triggers → backfill
├── entrypoint.sh              # Waits for PostgreSQL readiness
├── schema.sql                 # OLTP schema
├── schema_triggers.sql        # PL/pgSQL trigger functions
├── Dockerfile                 # Multi-stage build with uv
├── requirements.txt           # Python dependencies
├── pyproject.toml             # Project metadata
├── .env.example               # Environment variable template
├── src/data_engineering/
│   ├── config.py              # DB and pipeline configuration
│   ├── ingestion/extractors.py  # SQL extractors for backfill
│   ├── loading/models.py      # SQLAlchemy analytics table definitions
│   ├── loading/triggers.py    # Trigger deployment logic
│   ├── loading/writers.py     # Upsert writers + watermark logic
│   ├── pipeline/backfill.py   # Full and incremental backfill
│   └── utils/logging.py       # Logging setup
├── scripts/
│   ├── seed_data.py           # Static seed data
│   ├── seed_existing_data.py  # Append-only seed for non-empty DBs
│   └── seed_ai_oltp.py        # AI-generated seed via LangChain
└── tests/                     # Unit and integration tests
```
