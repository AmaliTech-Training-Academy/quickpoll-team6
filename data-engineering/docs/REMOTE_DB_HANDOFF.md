# Remote DB Handoff for Backend Integration

This document explains how to use a shared remote PostgreSQL database for
backend, frontend, and data-engineering integration after the trigger-based
analytics layer has been validated locally.

## When to Use the Remote DB

Use the shared remote database only after the trigger flow has already been
smoke-tested on the local Docker stack.

Recommended sequence:

1. Validate trigger deployment and backfill locally with
   `docker-compose.local.yml`
2. Provision or receive a shared remote PostgreSQL database
3. Deploy the analytics layer to that remote database once
4. Let backend and frontend teams integrate against that shared database

Do not use the remote database as your first debugging environment.

## What the Shared Remote DB Is For

The shared remote database is the team integration environment for:

- backend endpoint development
- frontend dashboard integration
- creator/admin dashboard validation
- end-to-end smoke tests on realistic shared data

After trigger deployment, the backend keeps writing to the normal OLTP tables.
PostgreSQL triggers then update the analytics tables automatically inside the
same database.

## What to Share with the Backend Developer

Share these connection details:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- any IP allowlist or VPN requirement

Also share these expectations:

- analytics tables live in the same PostgreSQL database as the OLTP tables
- no Kafka service is required for analytics anymore
- the data pipeline is now a setup/init step, not a long-running consumer

## Recommended Access Model

For the capstone, the simplest setup is:

- backend app user: read and write on OLTP tables, read on analytics tables
- data-engineering user: read OLTP tables, create/update analytics tables,
  deploy triggers, run backfill

If the team wants stricter separation, keep two database users:

- `quickpoll_app`
- `quickpoll_analytics`

That is optional for this sprint. One shared database user is acceptable if
that is how the environment is already managed.

## Remote Deployment Steps

From [main.py](../main.py), the pipeline does three things in order:

1. create analytics tables
2. deploy trigger functions from `schema_triggers.sql`
3. run backfill

You can deploy that to the remote DB in either of these ways.

### Option A: From the local machine with uv

1. Copy [.env.example](../.env.example) to `.env`
2. Set:
   - `ENVIRONMENT=staging`
   - remote `DB_*` values
3. Run:

```powershell
cd data-engineering
uv sync
uv run python main.py
```

### Option B: From Docker

Build the image:

```powershell
cd data-engineering
docker build -t quickpoll-data-engineering .
```

Then create an env file for the remote run, for example `.env.remote`, using
the same staging values from Option A.

After that, run:

```powershell
docker run --rm --env-file .env.remote quickpoll-data-engineering
```

Do not use `docker-compose.local.yml` for remote deployment. That compose file is
intentionally pinned to the local Docker Postgres instance.

## Verification Checklist

After deployment, verify all of the following on the remote database.

### 1. Analytics tables exist

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'analytics_%'
ORDER BY tablename;
```

Expected tables:

- `analytics_option_breakdown`
- `analytics_poll_summary`
- `analytics_user_participation`
- `analytics_votes_timeseries`

### 2. Trigger functions exist

```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
  'fn_refresh_poll_summary',
  'fn_refresh_all_poll_summaries',
  'fn_refresh_option_breakdown',
  'fn_refresh_votes_timeseries',
  'fn_refresh_user_participation',
  'fn_delete_poll_analytics'
)
ORDER BY proname;
```

### 3. Table triggers exist

```sql
SELECT tgname
FROM pg_trigger
WHERE tgname IN (
  'trg_vote_after_insert',
  'trg_poll_after_insert',
  'trg_poll_after_update',
  'trg_poll_after_delete',
  'trg_user_after_insert',
  'trg_user_after_update',
  'trg_option_after_insert',
  'trg_option_after_update',
  'trg_option_after_delete'
)
ORDER BY tgname;
```

### 4. Backfill populated analytics

```sql
SELECT
  (SELECT COUNT(*) FROM analytics_poll_summary) AS poll_summary_rows,
  (SELECT COUNT(*) FROM analytics_option_breakdown) AS option_rows,
  (SELECT COUNT(*) FROM analytics_votes_timeseries) AS timeseries_rows,
  (SELECT COUNT(*) FROM analytics_user_participation) AS user_rows;
```

### 5. Live writes update analytics

Smoke test one real backend action:

- create a poll
- add options
- cast a vote

Then confirm the related analytics rows changed.

## What the Backend Can Rely On

The backend should read dashboard data from these analytics tables:

- `analytics_poll_summary`
- `analytics_option_breakdown`
- `analytics_votes_timeseries`
- `analytics_user_participation`

For the dashboard contract, the key fields already available include:

- `creator_id`
- `title`
- `creator_name`
- `status`
- `expires_at`
- `description`
- `max_selections`
- `total_votes`
- `unique_voters`
- `participation_rate`
- `last_updated`

This means the backend should only need:

- access control
- filtering
- sorting
- pagination
- light response shaping

It should not compute core dashboard analytics from raw `votes` at request time.

## Operating Rules

- Do not run local seed scripts against the shared remote database unless the
  team explicitly wants that test data there.
- If trigger logic changes, rerun `uv run python main.py` to redeploy functions.
- If analytics drift or you need a reset, rerun with
  `FORCE_FULL_BACKFILL=true`.
- Treat the remote DB as the shared integration environment, not your personal
  scratch database.

## Recommended Team Workflow

1. Data engineer validates locally with Docker
2. Data engineer deploys triggers and backfill to remote DB
3. Backend dev builds dashboard endpoints against analytics tables
4. Frontend dev consumes backend endpoints
5. Team uses the same shared remote DB for integration checks

That gives you a safe local development loop and a stable shared environment for
actual team integration.
