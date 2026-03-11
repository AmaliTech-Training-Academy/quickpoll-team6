# Migration: Kafka Streaming → PostgreSQL Triggers

> **Handoff Document for AI Agent Implementation**
>
> This document describes how to replace the Kafka-based streaming pipeline with
> PostgreSQL trigger functions. Each section maps to a feature branch and Pull
> Request (PR). Follow the branch order — later branches depend on earlier ones.

---

## Table of Contents

1. [Context & Motivation](#1-context--motivation)
2. [Architecture: Before vs After](#2-architecture-before-vs-after)
3. [Current Codebase Map](#3-current-codebase-map)
4. [Branch Plan (6 PRs)](#4-branch-plan-6-prs)
   - [PR 1: `feature/pg-trigger-functions`](#pr-1-featurepg-trigger-functions)
   - [PR 2: `feature/trigger-deployment-module`](#pr-2-featuretrigger-deployment-module)
   - [PR 3: `feature/remove-kafka-streaming`](#pr-3-featureremove-kafka-streaming)
   - [PR 4: `feature/update-entrypoint-docker`](#pr-4-featureupdate-entrypoint-docker)
   - [PR 5: `feature/cleanup-kafka-dependencies`](#pr-5-featurecleanup-kafka-dependencies)
   - [PR 6: `feature/trigger-unit-tests`](#pr-6-featuretrigger-unit-tests)
5. [Detailed Implementation Specs](#5-detailed-implementation-specs)
6. [Files Affected Summary](#6-files-affected-summary)
7. [Testing Strategy](#7-testing-strategy)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. Context & Motivation

### Why Replace Kafka?

The current pipeline uses Kafka (Confluent 7.5.0) as an event bus between the
Spring Boot backend and the Python data-engineering consumer. Deploying Kafka +
Zookeeper to AWS requires either:

- **Amazon MSK** — too expensive for a capstone project (~$200+/month)
- **Self-managed Kafka on ECS/EC2** — adds ~$20/month + operational complexity
  (EBS volumes, Service Discovery, health checks, broker management)

### Why PostgreSQL Triggers Work Here

After analyzing the pipeline, we found that:

1. **The backend already writes to OLTP tables first**, then publishes to Kafka
   as an afterthought (`@TransactionalEventListener(phase = AFTER_COMMIT)`).
2. **Kafka events only contain IDs** (`poll_id`, `user_id`) — the Python
   consumer reads *back from the same OLTP tables* to recompute analytics.
3. **All analytics computations are simple SQL aggregations**: `COUNT`,
   `COUNT DISTINCT`, percentage math, hourly bucketing with `date_trunc`.
4. **There's no fan-out** — only one consumer group (`quickpoll-analytics`)
   reads from the topics. No other services consume these events.

PostgreSQL triggers fire on the same OLTP writes that currently produce Kafka
events. The trigger functions perform the same aggregations directly in SQL,
eliminating the need for Kafka, Zookeeper, the Python Kafka consumer loop, and
the `kafka-python` dependency entirely.

### Cost Impact

| Item                         | Before (Kafka) | After (Triggers) |
| ---------------------------- | -------------- | ----------------- |
| Kafka broker EC2             | ~$15/month     | $0                |
| Zookeeper EC2                | ~$5/month      | $0                |
| EBS volumes                  | ~$2.40/month   | $0                |
| Service Discovery            | <$1/month      | $0                |
| Data Pipeline Fargate (24/7) | ~$10/month     | ~$2/month (init)  |
| **Total infrastructure**     | **~$33/month** | **~$2/month**     |

### What Does NOT Change

- **Backend code** — zero changes. Backend still writes to `votes`, `polls`,
  `users` tables. Its Kafka publisher code becomes dead code but is harmless.
- **Analytics table schemas** — the 4 analytics tables remain identical.
- **Backfill logic** — `backfill.py` is preserved as a safety net for initial
  population and periodic reconciliation.
- **Transformation logic** — `transformers.py` (Pandas) is preserved for
  backfill. Triggers replicate the same logic in SQL.
- **Existing unit tests for transformers, backfill** — remain unchanged.

---

## 2. Architecture: Before vs After

### Before (Current — Kafka Streaming)

```
User votes → Backend INSERTs into votes table
           → Backend publishes VOTE_CAST to Kafka (AFTER_COMMIT)
           → Python KafkaConsumer polls every 5s
           → Consumer reads OLTP tables (extract_poll_by_id, etc.)
           → Pandas computes aggregations (compute_poll_summary, etc.)
           → Python UPSERTs analytics tables (ON CONFLICT DO UPDATE)
```

**Components**: Backend, Kafka, Zookeeper, Python consumer (24/7 Fargate task)

### After (Target — PostgreSQL Triggers)

```
User votes → Backend INSERTs into votes table
           → PostgreSQL trigger fires AFTER INSERT
           → PL/pgSQL function runs SQL aggregation
           → Function UPSERTs analytics tables (INSERT ... ON CONFLICT)
           → Done (all within the same DB transaction)
```

**Components**: Backend, PostgreSQL (RDS) — that's it.

**Data Pipeline's new role**: Runs once on startup to:
1. Create analytics tables (`CREATE TABLE IF NOT EXISTS`)
2. Deploy trigger functions (`CREATE OR REPLACE FUNCTION`)
3. Create triggers (`CREATE TRIGGER IF NOT EXISTS`)
4. Run initial backfill (for historical data)
5. Exit (or optionally stay for periodic scheduled backfill)

---

## 3. Current Codebase Map

### Files That Will Be Modified

| File | Current Role | Change |
| ---- | ------------ | ------ |
| `data-engineering/main.py` | Orchestrator: create tables → backfill → `run_streaming()` | Remove `run_streaming()` call, add trigger deployment step |
| `data-engineering/entrypoint.sh` | Waits for Postgres + Kafka, then runs `main.py` | Remove Kafka health check |
| `data-engineering/requirements.txt` | Includes `kafka-python==2.0.2` | Remove `kafka-python` |
| `data-engineering/pyproject.toml` | Includes `kafka-python==2.0.2` in dependencies | Remove `kafka-python` |
| `data-engineering/Dockerfile` | Installs `netcat-openbsd` for Kafka port check | Remove `netcat-openbsd` |
| `data-engineering/src/data_engineering/config.py` | Kafka config section (~40 lines) | Remove Kafka config variables |
| `data-engineering/docker-compose.kafka-dev.yml` | Local dev stack with Kafka + ZK | Remove kafka/zookeeper services |

### Files That Will Be Created

| File | Purpose |
| ---- | ------- |
| `data-engineering/schema_triggers.sql` | All PL/pgSQL trigger functions and trigger definitions |
| `data-engineering/src/data_engineering/loading/triggers.py` | Python module to deploy triggers to PostgreSQL via SQLAlchemy |
| `data-engineering/tests/unit/test_triggers.py` | Unit tests for trigger deployment module |

### Files That Will NOT Change

| File | Why |
| ---- | --- |
| `src/data_engineering/pipeline/backfill.py` | Backfill is preserved as safety net |
| `src/data_engineering/transformation/transformers.py` | Pandas transformers used by backfill |
| `src/data_engineering/loading/models.py` | Analytics table definitions unchanged |
| `src/data_engineering/loading/writers.py` | Upsert writers used by backfill |
| `src/data_engineering/ingestion/extractors.py` | SQL extractors used by backfill |
| `tests/unit/test_transformers.py` | Existing tests remain valid |
| `tests/unit/test_backfill.py` | Existing tests remain valid |
| `tests/conftest.py` | Shared fixtures unchanged |

### Files That COULD Be Removed (Optional)

| File | Notes |
| ---- | ----- |
| `src/data_engineering/pipeline/streaming.py` | Entire Kafka consumer loop — no longer needed |
| `src/data_engineering/ingestion/consumers.py` | Kafka consumer factory + DLQ writer — no longer needed |
| `tests/unit/test_streaming.py` | Tests for removed streaming code |
| `tests/unit/test_consumers.py` | Tests for removed consumer code |
| `scripts/mock_producer.py` | Kafka mock producer — no longer needed |

> **Decision**: Do NOT delete these files in the migration PRs. Instead, mark
> them as deprecated with a module-level comment. They can be removed in a
> follow-up cleanup PR after the migration is verified in production.

---

## 4. Branch Plan (6 PRs)

Following the code-review-guide: each PR covers **one logical unit of work**,
is **under 200 lines of changes**, and includes a **clear description**.

### Merge Order (Sequential — Each Depends on Previous)

```
main/develop
  └── PR 1: feature/pg-trigger-functions       (new SQL file)
      └── PR 2: feature/trigger-deployment-module   (new Python module)
          └── PR 3: feature/remove-kafka-streaming  (modify main.py, config.py)
              └── PR 4: feature/update-entrypoint-docker  (entrypoint.sh, Dockerfile, docker-compose)
                  └── PR 5: feature/cleanup-kafka-dependencies  (requirements.txt, pyproject.toml)
                      └── PR 6: feature/trigger-unit-tests  (new test file)
```

> **Note**: PRs 1 and 2 are additive (new files only, no breaking changes).
> PRs 3-5 are the breaking changes. PR 6 adds test coverage for the new code.
> This ordering means the pipeline keeps working after each merge — it just
> gains the triggers alongside Kafka until PR 3 removes the streaming call.

---

### PR 1: `feature/pg-trigger-functions`

**Title**: Add PostgreSQL trigger functions and triggers for real-time analytics

**Description**: Creates `schema_triggers.sql` containing 4 PL/pgSQL trigger
functions and 4 triggers that replicate the analytics computation currently done
by the Python Kafka consumer. These functions fire on INSERT/UPDATE on the OLTP
tables (`votes`, `polls`, `users`) and upsert into the 4 analytics tables.

**Files Changed**: 1 new file

| File | Action |
| ---- | ------ |
| `data-engineering/schema_triggers.sql` | **CREATE** |

**Estimated Lines**: ~180

**What to Implement**:

Create `data-engineering/schema_triggers.sql` with the following SQL objects
(all using `CREATE OR REPLACE` for idempotency):

#### Function 1: `fn_refresh_poll_summary(p_poll_id BIGINT)`

Replicates `compute_poll_summary()` from `transformers.py`. Must:

```sql
-- Pseudocode (implement as actual PL/pgSQL):
CREATE OR REPLACE FUNCTION fn_refresh_poll_summary(p_poll_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_total_users INT;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;

    INSERT INTO analytics_poll_summary (
        poll_id, title, creator_name, status,
        total_votes, unique_voters, participation_rate,
        created_at, last_updated
    )
    SELECT
        p.id AS poll_id,
        COALESCE(p.title, p.question) AS title,
        u.full_name AS creator_name,
        CASE WHEN p.active THEN 'ACTIVE' ELSE 'CLOSED' END AS status,
        COALESCE(v.total_votes, 0) AS total_votes,
        COALESCE(v.unique_voters, 0) AS unique_voters,
        ROUND(
            COALESCE(v.unique_voters, 0)::NUMERIC
            / GREATEST(v_total_users, 1) * 100, 2
        ) AS participation_rate,
        p.created_at,
        NOW() AS last_updated
    FROM polls p
    JOIN users u ON p.creator_id = u.id
    LEFT JOIN (
        SELECT
            poll_id,
            COUNT(*) AS total_votes,
            COUNT(DISTINCT user_id) AS unique_voters
        FROM votes
        WHERE poll_id = p_poll_id
        GROUP BY poll_id
    ) v ON v.poll_id = p.id
    WHERE p.id = p_poll_id
    ON CONFLICT (poll_id) DO UPDATE SET
        title = EXCLUDED.title,
        creator_name = EXCLUDED.creator_name,
        status = EXCLUDED.status,
        total_votes = EXCLUDED.total_votes,
        unique_voters = EXCLUDED.unique_voters,
        participation_rate = EXCLUDED.participation_rate,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;
```

**Key mapping from Python → SQL**:
- `polls_df["active"].map({True: "ACTIVE", False: "CLOSED"})` →
  `CASE WHEN p.active THEN 'ACTIVE' ELSE 'CLOSED' END`
- `votes_df.groupby("poll_id")["user_id"].agg(count="count", nunique="nunique")` →
  `COUNT(*), COUNT(DISTINCT user_id) ... GROUP BY poll_id`
- `unique_voters / total_users * 100` →
  `unique_voters::NUMERIC / GREATEST(v_total_users, 1) * 100`

#### Function 2: `fn_refresh_option_breakdown(p_poll_id BIGINT)`

Replicates `compute_option_breakdown()` from `transformers.py`. Must:

```sql
-- Pseudocode:
-- For each option in the given poll:
--   1. Count votes for that option
--   2. Calculate percentage = option_votes / poll_total_votes * 100
--   3. UPSERT into analytics_option_breakdown ON CONFLICT (option_id)
```

**Key mapping from Python → SQL**:
- `votes_df.groupby("option_id").size()` → `COUNT(*) ... GROUP BY option_id`
- `result.groupby("poll_id")["vote_count"].transform("sum")` →
  `SUM(vote_count) OVER (PARTITION BY poll_id)`
  or a subquery for the poll total
- `vote_count / poll_total * 100` →
  `vote_count::NUMERIC / NULLIF(poll_total, 0) * 100`

#### Function 3: `fn_refresh_votes_timeseries(p_poll_id BIGINT, p_vote_time TIMESTAMP)`

Replicates the timeseries upsert from `_handle_vote_event()` in `streaming.py`. Must:

```sql
-- Pseudocode:
-- 1. Truncate p_vote_time to the hour: date_trunc('hour', p_vote_time)
-- 2. Count all votes for this poll in that hour bucket
-- 3. UPSERT into analytics_votes_timeseries ON CONFLICT (poll_id, bucket_time)
```

**Key mapping from Python → SQL**:
- `pd.Timestamp.now().floor("h")` → `date_trunc('hour', p_vote_time)`
- The UniqueConstraint name is `uq_timeseries_poll_bucket`

#### Function 4: `fn_refresh_user_participation(p_user_id BIGINT)`

Replicates `compute_user_participation()` from `transformers.py`. Must:

```sql
-- Pseudocode:
-- 1. Count total votes cast by this user
-- 2. Count distinct polls participated in
-- 3. Count polls created by this user
-- 4. Get MAX(created_at) from votes as last_active
-- 5. UPSERT into analytics_user_participation ON CONFLICT (user_id)
```

**Key mapping from Python → SQL**:
- `votes_df.groupby("user_id").agg(count, nunique, max)` →
  `COUNT(*), COUNT(DISTINCT poll_id), MAX(created_at) FROM votes WHERE user_id = p_user_id`
- `polls_df.groupby("creator_id").size()` →
  `SELECT COUNT(*) FROM polls WHERE creator_id = p_user_id`

#### Trigger Definitions

```sql
-- Trigger 1: After a vote is inserted
CREATE OR REPLACE FUNCTION trg_after_vote_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.poll_id);
    PERFORM fn_refresh_option_breakdown(NEW.poll_id);
    PERFORM fn_refresh_votes_timeseries(NEW.poll_id, NEW.created_at);
    PERFORM fn_refresh_user_participation(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create if not exists (DROP + CREATE pattern for idempotency)
DROP TRIGGER IF EXISTS trg_vote_after_insert ON votes;
CREATE TRIGGER trg_vote_after_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_vote_insert();

-- Trigger 2: After a poll is inserted
CREATE OR REPLACE FUNCTION trg_after_poll_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_after_insert ON polls;
CREATE TRIGGER trg_poll_after_insert
    AFTER INSERT ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_poll_insert();

-- Trigger 3: After a poll is updated (handles active → false = CLOSED)
CREATE OR REPLACE FUNCTION trg_after_poll_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_after_update ON polls;
CREATE TRIGGER trg_poll_after_update
    AFTER UPDATE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_poll_update();

-- Trigger 4: After a user is inserted (initialize participation row)
CREATE OR REPLACE FUNCTION trg_after_user_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_user_participation(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_after_insert ON users;
CREATE TRIGGER trg_user_after_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_user_insert();
```

**Acceptance Criteria**:
- [ ] All 4 functions use `CREATE OR REPLACE FUNCTION` (idempotent)
- [ ] All triggers use `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` (idempotent)
- [ ] All `INSERT INTO analytics_*` use `ON CONFLICT ... DO UPDATE`
- [ ] `fn_refresh_poll_summary` matches the output of `compute_poll_summary()`
- [ ] `fn_refresh_option_breakdown` matches the output of `compute_option_breakdown()`
- [ ] `fn_refresh_votes_timeseries` matches the output of the timeseries upsert
- [ ] `fn_refresh_user_participation` matches the output of `compute_user_participation()`
- [ ] SQL file can be executed multiple times without errors

---

### PR 2: `feature/trigger-deployment-module`

**Title**: Add Python module to deploy trigger functions to PostgreSQL on startup

**Description**: Creates `triggers.py` in the loading module. This module reads
`schema_triggers.sql` and executes it against the PostgreSQL database using
SQLAlchemy. Called during pipeline startup to ensure triggers exist in RDS.

**Files Changed**: 1 new file

| File | Action |
| ---- | ------ |
| `data-engineering/src/data_engineering/loading/triggers.py` | **CREATE** |

**Estimated Lines**: ~40

**What to Implement**:

```python
"""Deploy PostgreSQL trigger functions and triggers on startup."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# schema_triggers.sql lives next to the project root (data-engineering/)
_SQL_FILE = Path(__file__).resolve().parents[3] / "schema_triggers.sql"


def deploy_triggers(engine: Engine) -> None:
    """Execute schema_triggers.sql against PostgreSQL.

    Uses CREATE OR REPLACE and DROP TRIGGER IF EXISTS, so this is
    safe to call on every startup (idempotent).
    """
    sql_content = _SQL_FILE.read_text(encoding="utf-8")

    with engine.begin() as conn:
        conn.execute(text(sql_content))

    logger.info("Trigger functions and triggers deployed successfully.")
```

**Key Details**:
- The `_SQL_FILE` path resolution: `triggers.py` is at
  `src/data_engineering/loading/triggers.py`. Three parents up from there
  is `data-engineering/` where `schema_triggers.sql` lives.
- Uses `engine.begin()` for transactional execution — if any statement fails,
  the entire deployment is rolled back.
- Uses `text()` wrapper so SQLAlchemy treats it as raw SQL.

**Acceptance Criteria**:
- [ ] `deploy_triggers(engine)` reads and executes `schema_triggers.sql`
- [ ] Execution is wrapped in a transaction (rollback on failure)
- [ ] Function is importable: `from data_engineering.loading.triggers import deploy_triggers`
- [ ] Logging confirms successful deployment

---

### PR 3: `feature/remove-kafka-streaming`

**Title**: Replace Kafka streaming with trigger deployment in pipeline startup

**Description**: Updates `main.py` to call `deploy_triggers()` instead of
`run_streaming()`. Updates `config.py` to make Kafka configuration optional
(guarded by a feature flag or simply removed). Marks `streaming.py` and
`consumers.py` as deprecated.

**Files Changed**: 3 modified files

| File | Action |
| ---- | ------ |
| `data-engineering/main.py` | **MODIFY** — replace `run_streaming()` with `deploy_triggers()` |
| `data-engineering/src/data_engineering/config.py` | **MODIFY** — remove/guard Kafka config |
| `data-engineering/src/data_engineering/pipeline/streaming.py` | **MODIFY** — add deprecation notice |
| `data-engineering/src/data_engineering/ingestion/consumers.py` | **MODIFY** — add deprecation notice |

**Estimated Lines Changed**: ~60

**What to Implement**:

#### `main.py` — New Version

```python
"""Entry point for the QuickPoll data engineering pipeline."""

from __future__ import annotations

import logging

from data_engineering.config import get_engine
from data_engineering.loading.models import create_analytics_tables
from data_engineering.loading.triggers import deploy_triggers
from data_engineering.pipeline.backfill import run_backfill
from data_engineering.utils.logging import configure_logging

logger = logging.getLogger(__name__)


def main() -> None:
    """Bootstrap the pipeline: create tables → deploy triggers → backfill."""
    configure_logging()

    engine = get_engine()
    create_analytics_tables(engine)
    logger.info("Analytics tables ensured.")

    deploy_triggers(engine)
    logger.info("Trigger functions deployed to PostgreSQL.")

    run_backfill()
    logger.info("Initial backfill complete. Pipeline setup finished.")


if __name__ == "__main__":
    main()
```

**Changes from current `main.py`**:
1. **Remove**: `from data_engineering.ingestion.consumers import check_dlq_bucket`
2. **Remove**: `from data_engineering.pipeline.streaming import run_streaming`
3. **Add**: `from data_engineering.loading.triggers import deploy_triggers`
4. **Remove**: `check_dlq_bucket()` call (DLQ no longer needed — triggers are
   transactional)
5. **Remove**: `run_streaming()` call (replaced by `deploy_triggers(engine)`)
6. Pipeline now **exits after backfill** instead of running forever

#### `config.py` — Changes

Remove or comment out the entire Kafka section (~40 lines):

```python
# Lines to REMOVE from config.py:
# ── Kafka ────────────────────────────────────────────────────
# if ENVIRONMENT == "staging":
#     KAFKA_BOOTSTRAP_SERVERS: str = ...
#     KAFKA_SASL_USERNAME: str = ...
#     ...
# KAFKA_TOPIC_VOTE_EVENTS: str = ...
# KAFKA_TOPIC_POLL_EVENTS: str = ...
# KAFKA_GROUP_ID: str = ...
# def get_kafka_security_config() -> dict[str, Any]: ...
```

Also remove:
- `BACKFILL_INTERVAL_MINUTES` (no longer needed — backfill runs once, not periodically)

Keep:
- All database config (`DB_HOST`, `DB_PORT`, etc.)
- `FORCE_FULL_BACKFILL`, `WATERMARK_OVERLAP_MINUTES` (used by backfill)
- `LOG_LEVEL`
- DLQ config (can be removed later, but not breaking)
- Engine singleton

#### `streaming.py` — Add Deprecation Notice

Add at the top of the file (line 1):

```python
"""DEPRECATED: Kafka consumer loop — replaced by PostgreSQL triggers.

This module is no longer used in the main pipeline. Trigger functions in
schema_triggers.sql handle real-time analytics updates. This file is
retained for reference and potential rollback.

See: docs/KAFKA_TO_TRIGGERS_MIGRATION.md
"""
```

#### `consumers.py` — Add Deprecation Notice

Same pattern — add deprecation docstring at the top.

**Acceptance Criteria**:
- [ ] `main.py` calls `deploy_triggers(engine)` instead of `run_streaming()`
- [ ] `main.py` no longer imports from `streaming` or `consumers`
- [ ] `main.py` exits after backfill (no infinite loop)
- [ ] Kafka config variables removed from `config.py`
- [ ] `streaming.py` and `consumers.py` have deprecation notices
- [ ] All existing tests still pass (backfill tests don't depend on Kafka)

---

### PR 4: `feature/update-entrypoint-docker`

**Title**: Remove Kafka dependency from entrypoint, Dockerfile, and docker-compose

**Description**: Updates `entrypoint.sh` to remove the Kafka health check.
Updates `Dockerfile` to remove `netcat-openbsd` (no longer needed for `nc -z`).
Updates `docker-compose.kafka-dev.yml` to remove kafka/zookeeper services.

**Files Changed**: 3 modified files

| File | Action |
| ---- | ------ |
| `data-engineering/entrypoint.sh` | **MODIFY** — remove Kafka health check |
| `data-engineering/Dockerfile` | **MODIFY** — remove `netcat-openbsd` |
| `data-engineering/docker-compose.kafka-dev.yml` | **MODIFY** — remove kafka + zookeeper services |

**Estimated Lines Changed**: ~50

**What to Implement**:

#### `entrypoint.sh` — New Version

```bash
#!/bin/bash
# entrypoint.sh — Wait for Postgres to be ready, then start the pipeline.
set -e

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -q; do
    sleep 2
done
echo "PostgreSQL is ready."

echo "Starting QuickPoll analytics pipeline..."
exec python main.py
```

**Removed**: The entire Kafka readiness check block (lines 13-19 of current file).

#### `Dockerfile` — Changes

Change the `apt-get install` line to remove `netcat-openbsd`:

```dockerfile
# BEFORE:
RUN apt-get update && apt-get install -y --no-install-recommends \
        sudo \
        postgresql-client \
        netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# AFTER:
RUN apt-get update && apt-get install -y --no-install-recommends \
        sudo \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*
```

#### `docker-compose.kafka-dev.yml` — Changes

Remove the `zookeeper` and `kafka` services entirely. Remove the `kafka`
dependency from `data-pipeline` service. The file becomes:

```yaml
services:
  postgres:
    image: postgres:17
    container_name: qp-postgres
    environment:
      POSTGRES_DB: quickpoll
      POSTGRES_USER: quickpoll
      POSTGRES_PASSWORD: quickpoll123
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U quickpoll -d quickpoll"]
      interval: 10s
      timeout: 5s
      retries: 10

  data-pipeline:
    build: .
    container_name: qp-data-pipeline
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - ./.env
    environment:
      DB_HOST: postgres
      DB_PORT: "5432"

volumes:
  pgdata:
```

**Acceptance Criteria**:
- [ ] `entrypoint.sh` only checks PostgreSQL readiness (no Kafka)
- [ ] Dockerfile does not install `netcat-openbsd`
- [ ] `docker-compose.kafka-dev.yml` has no kafka or zookeeper services
- [ ] `data-pipeline` service only depends on `postgres`
- [ ] `docker compose -f docker-compose.kafka-dev.yml up` works with only Postgres

---

### PR 5: `feature/cleanup-kafka-dependencies`

**Title**: Remove kafka-python from project dependencies

**Description**: Removes `kafka-python` from `requirements.txt` and
`pyproject.toml`. This is separate from PR 3 because dependency changes
should be atomic and easy to review/revert.

**Files Changed**: 2 modified files

| File | Action |
| ---- | ------ |
| `data-engineering/requirements.txt` | **MODIFY** — remove `kafka-python==2.0.2` |
| `data-engineering/pyproject.toml` | **MODIFY** — remove `kafka-python==2.0.2` from dependencies |

**Estimated Lines Changed**: ~4

**What to Implement**:

#### `requirements.txt` — New Version

```
pandas==2.1.3
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
python-decouple==3.8
boto3==1.34.0
langchain>=1.0,<2.0
langchain-groq>=1.0,<2.0
langchain-google-genai>=4.2.1
```

(Removed: `kafka-python==2.0.2`)

#### `pyproject.toml` — Change

Remove `"kafka-python==2.0.2",` from the `dependencies` list.

**Post-merge action**: Run `uv sync` to update `uv.lock`.

**Acceptance Criteria**:
- [ ] `kafka-python` is not in `requirements.txt`
- [ ] `kafka-python` is not in `pyproject.toml` dependencies
- [ ] Both files match (same packages listed)
- [ ] `uv sync` succeeds without errors
- [ ] `uv pip list` does not show `kafka-python`

---

### PR 6: `feature/trigger-unit-tests`

**Title**: Add unit tests for trigger deployment module

**Description**: Adds tests for the `deploy_triggers()` function and validates
that `schema_triggers.sql` is syntactically valid. Tests use mocked SQLAlchemy
engine.

**Files Changed**: 1 new file

| File | Action |
| ---- | ------ |
| `data-engineering/tests/unit/test_triggers.py` | **CREATE** |

**Estimated Lines**: ~80

**What to Implement**:

```python
"""Unit tests for trigger deployment module."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch, mock_open

import pytest

from data_engineering.loading.triggers import deploy_triggers, _SQL_FILE


class TestDeployTriggers:
    """Tests for deploy_triggers function."""

    def test_sql_file_exists(self) -> None:
        """schema_triggers.sql must exist at the expected path."""
        assert _SQL_FILE.exists(), f"Expected SQL file at {_SQL_FILE}"

    def test_sql_file_contains_trigger_functions(self) -> None:
        """SQL file must define all 4 trigger functions."""
        content = _SQL_FILE.read_text(encoding="utf-8")
        assert "fn_refresh_poll_summary" in content
        assert "fn_refresh_option_breakdown" in content
        assert "fn_refresh_votes_timeseries" in content
        assert "fn_refresh_user_participation" in content

    def test_sql_file_contains_triggers(self) -> None:
        """SQL file must define all 4 triggers."""
        content = _SQL_FILE.read_text(encoding="utf-8")
        assert "trg_vote_after_insert" in content
        assert "trg_poll_after_insert" in content
        assert "trg_poll_after_update" in content
        assert "trg_user_after_insert" in content

    def test_sql_file_is_idempotent(self) -> None:
        """SQL file must use CREATE OR REPLACE and DROP IF EXISTS."""
        content = _SQL_FILE.read_text(encoding="utf-8")
        assert "CREATE OR REPLACE FUNCTION" in content
        assert "DROP TRIGGER IF EXISTS" in content

    def test_deploy_triggers_executes_sql(self) -> None:
        """deploy_triggers() must execute the SQL file content."""
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_engine.begin.return_value.__exit__ = MagicMock(return_value=False)

        deploy_triggers(mock_engine)

        mock_conn.execute.assert_called_once()

    def test_deploy_triggers_uses_transaction(self) -> None:
        """deploy_triggers() must use engine.begin() for transactional execution."""
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_engine.begin.return_value.__enter__ = MagicMock(return_value=mock_conn)
        mock_engine.begin.return_value.__exit__ = MagicMock(return_value=False)

        deploy_triggers(mock_engine)

        mock_engine.begin.assert_called_once()
```

**Acceptance Criteria**:
- [ ] All tests pass with `pytest tests/unit/test_triggers.py`
- [ ] Tests validate SQL file existence and content
- [ ] Tests validate deployment function behavior
- [ ] `ruff check` passes
- [ ] `ruff format` passes

---

## 5. Detailed Implementation Specs

### Analytics Computation: Python → SQL Translation Reference

This table maps every Pandas operation to its SQL equivalent. Use this as the
authoritative reference when writing `schema_triggers.sql`.

#### `fn_refresh_poll_summary(p_poll_id)`

| Python (transformers.py) | SQL (schema_triggers.sql) |
| ---- | ---- |
| `polls_df.rename(columns={"id": "poll_id"})` | `SELECT p.id AS poll_id` |
| `result["active"].map({True: "ACTIVE", False: "CLOSED"})` | `CASE WHEN p.active THEN 'ACTIVE' ELSE 'CLOSED' END` |
| `votes_df.groupby("poll_id")["user_id"].agg(count, nunique)` | `COUNT(*), COUNT(DISTINCT user_id) FROM votes WHERE poll_id = p_poll_id` |
| `.merge(agg, on="poll_id", how="left")` | `LEFT JOIN (...) v ON v.poll_id = p.id` |
| `.fillna(0).astype(int)` | `COALESCE(..., 0)` |
| `unique_voters / total_users * 100` | `unique_voters::NUMERIC / GREATEST(v_total_users, 1) * 100` |
| `.round(2)` | `ROUND(..., 2)` |
| `upsert_poll_summary(df)` with `ON CONFLICT (poll_id) DO UPDATE` | `INSERT ... ON CONFLICT (poll_id) DO UPDATE SET ...` |

#### `fn_refresh_option_breakdown(p_poll_id)`

| Python (transformers.py) | SQL (schema_triggers.sql) |
| ---- | ---- |
| `options_df.rename(columns={"id": "option_id"})` | `SELECT po.id AS option_id` |
| `votes_df.groupby("option_id").size()` | `COUNT(*) FROM votes WHERE option_id = po.id` |
| `.merge(counts, on="option_id", how="left")` | `LEFT JOIN (...) vc ON vc.option_id = po.id` |
| `.fillna(0)` | `COALESCE(..., 0)` |
| `groupby("poll_id")["vote_count"].transform("sum")` | `SUM(...) OVER (PARTITION BY poll_id)` or subquery |
| `vote_count / poll_total * 100` | `COALESCE(vc.cnt, 0)::NUMERIC / NULLIF(poll_total, 0) * 100` |
| `ON CONFLICT (option_id) DO UPDATE` | Same |

#### `fn_refresh_votes_timeseries(p_poll_id, p_vote_time)`

| Python (streaming.py) | SQL (schema_triggers.sql) |
| ---- | ---- |
| `pd.Timestamp.now().floor("h")` | `date_trunc('hour', p_vote_time)` |
| Count votes in that bucket | `SELECT COUNT(*) FROM votes WHERE poll_id = p_poll_id AND date_trunc('hour', created_at) = bucket` |
| `ON CONFLICT (poll_id, bucket_time)` constraint `uq_timeseries_poll_bucket` | Same |

#### `fn_refresh_user_participation(p_user_id)`

| Python (transformers.py) | SQL (schema_triggers.sql) |
| ---- | ---- |
| `votes_df.groupby("user_id").agg(count, nunique, max)` | `COUNT(*), COUNT(DISTINCT poll_id), MAX(created_at) FROM votes WHERE user_id = p_user_id` |
| `polls_df.groupby("creator_id").size()` | `SELECT COUNT(*) FROM polls WHERE creator_id = p_user_id` |
| `users_df.rename(columns={"full_name": "user_name"})` | `SELECT full_name AS user_name FROM users WHERE id = p_user_id` |
| `ON CONFLICT (user_id) DO UPDATE` | Same |

---

## 6. Files Affected Summary

### Complete File Inventory

| File | PR | Action | Lines Changed |
| ---- | -- | ------ | ------------- |
| `schema_triggers.sql` | PR 1 | CREATE | ~180 |
| `src/data_engineering/loading/triggers.py` | PR 2 | CREATE | ~40 |
| `main.py` | PR 3 | MODIFY | ~15 |
| `src/data_engineering/config.py` | PR 3 | MODIFY | ~40 (removed) |
| `src/data_engineering/pipeline/streaming.py` | PR 3 | MODIFY | ~5 (deprecation) |
| `src/data_engineering/ingestion/consumers.py` | PR 3 | MODIFY | ~5 (deprecation) |
| `entrypoint.sh` | PR 4 | MODIFY | ~8 (removed) |
| `Dockerfile` | PR 4 | MODIFY | ~2 |
| `docker-compose.kafka-dev.yml` | PR 4 | MODIFY | ~40 (removed) |
| `requirements.txt` | PR 5 | MODIFY | ~1 (removed) |
| `pyproject.toml` | PR 5 | MODIFY | ~1 (removed) |
| `tests/unit/test_triggers.py` | PR 6 | CREATE | ~80 |

**Total**: 12 files, ~420 lines of changes across 6 PRs

---

## 7. Testing Strategy

### Unit Tests (PR 6)

- Validate `schema_triggers.sql` exists and contains expected function/trigger names
- Validate `deploy_triggers()` executes SQL via SQLAlchemy engine
- Mock-based — no real database needed

### Integration Tests (Manual / Post-Merge)

After all 6 PRs are merged, verify end-to-end:

```bash
# Start only Postgres (no Kafka)
cd data-engineering
docker compose -f docker-compose.kafka-dev.yml up -d

# Wait for Postgres to be ready, then run the pipeline
docker compose -f docker-compose.kafka-dev.yml exec data-pipeline python main.py

# In another terminal, connect to Postgres and verify:
psql -h localhost -U quickpoll -d quickpoll

-- Insert a test vote and verify triggers fire:
INSERT INTO users (email, password, full_name, role, created_at)
VALUES ('test@test.com', 'pass', 'Test User', 'USER', NOW());

INSERT INTO polls (title, description, question, creator_id, active, created_at)
VALUES ('Test Poll', 'desc', 'Question?', 1, true, NOW());

INSERT INTO poll_options (poll_id, option_text) VALUES (1, 'Option A');
INSERT INTO poll_options (poll_id, option_text) VALUES (1, 'Option B');

INSERT INTO votes (poll_id, option_id, user_id, created_at)
VALUES (1, 1, 1, NOW());

-- Verify analytics tables were populated by triggers:
SELECT * FROM analytics_poll_summary;       -- Should have 1 row
SELECT * FROM analytics_option_breakdown;   -- Should have 2 rows
SELECT * FROM analytics_votes_timeseries;   -- Should have 1 row
SELECT * FROM analytics_user_participation; -- Should have 1 row
```

### Regression Tests

All existing tests must continue to pass after each PR:

```bash
cd data-engineering
.venv\Scripts\activate    # Windows
pytest tests/ -v
ruff check
ruff format --check
```

---

## 8. Rollback Plan

If triggers cause issues in production:

1. **Disable triggers** (instant, no deployment needed):
   ```sql
   ALTER TABLE votes DISABLE TRIGGER trg_vote_after_insert;
   ALTER TABLE polls DISABLE TRIGGER trg_poll_after_insert;
   ALTER TABLE polls DISABLE TRIGGER trg_poll_after_update;
   ALTER TABLE users DISABLE TRIGGER trg_user_after_insert;
   ```

2. **Re-enable Kafka streaming**: Revert PRs 3-5 (restore `run_streaming()`
   in `main.py`, restore Kafka config, restore `kafka-python` dependency).

3. **Re-deploy**: The deprecated `streaming.py` and `consumers.py` files are
   still in the codebase — they just aren't called. Reverting `main.py` to
   call `run_streaming()` again restores the Kafka pipeline.

This is why we **do not delete** the Kafka-related files — only deprecate them.

---

## Appendix: Environment Variables After Migration

### Required (Production/Staging)

```env
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=quickpoll
DB_USER=quickpoll
DB_PASSWORD: <from-secrets-manager>
ENVIRONMENT=staging
LOG_LEVEL=INFO
FORCE_FULL_BACKFILL=false
WATERMARK_OVERLAP_MINUTES=5
```

### Removed (No Longer Needed)

```env
# KAFKA_BOOTSTRAP_SERVERS    — removed
# KAFKA_SASL_USERNAME        — removed
# KAFKA_SASL_PASSWORD        — removed
# KAFKA_SASL_MECHANISM       — removed
# KAFKA_SSL_CAFILE           — removed
# KAFKA_TOPIC_VOTE_EVENTS    — removed
# KAFKA_TOPIC_POLL_EVENTS    — removed
# KAFKA_GROUP_ID             — removed
# BACKFILL_INTERVAL_MINUTES  — removed (backfill runs once, not periodically)
```
