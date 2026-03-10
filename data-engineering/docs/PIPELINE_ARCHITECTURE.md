# QuickPoll Real-Time Data Pipeline Architecture

**Author:** Henry Nana Antwi — Data Engineer, Team 6  
**Project:** QuickPoll — AmaliTech Phase 1 Capstone  
**Date:** March 2026

---

## 1. Overview

This document describes the end-to-end real-time analytics pipeline for QuickPoll. The pipeline uses Apache Kafka as the event backbone to achieve near-real-time KPI computation. The backend publishes domain events to Kafka topics on every meaningful action (vote cast, poll created, poll closed). A Python consumer subscribes to those topics, computes aggregated metrics, and writes results into PostgreSQL analytics tables. The frontend dashboard reads from those analytics tables.

---

## 2. System-Level Architecture

The full system runs inside Docker Compose on a single AWS EC2 instance. All services share one Docker network. External traffic reaches the frontend on port 4200 and the backend REST API on port 8080. Kafka and PostgreSQL are internal only.

```
                         AWS EC2 Instance
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌─────────────────────  Docker Compose  ─────────────────────┐   │
│  │                                                            │   │
│  │  ┌────────────────┐    HTTP     ┌───────────────────────┐  │   │
│  │  │   Angular      │ ◄─────────► │  Spring Boot Backend  │  │   │
│  │  │   Frontend     │             │        :8080          │  │   │
│  │  │   :4200        │             └──────────┬────────────┘  │   │
│  │  └────────────────┘                        │               │   │
│  │                              publishes     │  reads/writes  │   │
│  │                                 │          │               │   │
│  │                           ┌─────┘          │               │   │
│  │                           ▼                ▼               │   │
│  │  ┌────────────┐  ┌─────────────────┐  ┌────────────────┐  │   │
│  │  │ Zookeeper  │◄►│  Kafka Broker   │  │  PostgreSQL    │  │   │
│  │  │  :2181     │  │     :9092       │  │    :5432       │  │   │
│  │  └────────────┘  │  vote_events    │  │                │  │   │
│  │                  │  poll_events    │  │  ┌──────────┐  │  │   │
│  │                  └───────┬─────────┘  │  │  Raw     │  │  │   │
│  │                          │ subscribes │  │  Tables  │  │  │   │
│  │                          ▼            │  ├──────────┤  │  │   │
│  │             ┌─────────────────────┐   │  │Analytics │  │  │   │
│  │             │  Data Engineering   │   │  │  Tables  │  │  │   │
│  │             │  Python Consumer    │──►│  └──────────┘  │  │   │
│  │             └─────────────────────┘   └────────────────┘  │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

**Service responsibilities:**
- **Angular Frontend** — serves the UI; calls backend REST API for all data including dashboard metrics
- **Spring Boot Backend** — handles all user-facing API requests; writes raw operational tables; publishes events to Kafka
- **Kafka Broker** — event bus that decouples backend writes from data engineering processing
- **Zookeeper** — manages Kafka broker metadata (required by Kafka)
- **PostgreSQL** — single database holding both raw operational tables (backend-owned) and analytics tables (data engineering-owned)
- **Data Engineering** — long-running Python consumer; processes Kafka events, computes KPIs, writes to analytics tables

---

## 3. Application-Level Architecture (Data Engineering)

This zooms into the Data Engineering container only — from Kafka message arrival through transformation to PostgreSQL analytics write.

```
┌────────────────────────────────────────────────────────────────────┐
│                   Data Engineering Container                       │
│                                                                    │
│  ┌─────────────────────── config.py ──────────────────────────┐   │
│  │  DB_URL: postgresql://quickpoll:***@postgres:5432/quickpoll │   │
│  │  KAFKA_BOOTSTRAP_SERVERS: kafka:9092                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────── etl_pipeline.py ─────────────────────────┐   │
│  │                                                            │   │
│  │  ┌──────────────── Kafka Consumer Loop ──────────────────┐ │   │
│  │  │                                                       │ │   │
│  │  │  vote_events ─────────► handle_vote_event(msg)       │ │   │
│  │  │  poll_events ─────────► handle_poll_event(msg)       │ │   │
│  │  │                                  │                   │ │   │
│  │  └──────────────────────────────────┼───────────────────┘ │   │
│  │                                     ▼                      │   │
│  │  ┌──────────────── Transformation Layer ─────────────────┐ │   │
│  │  │                                                       │ │   │
│  │  │  validate_event()                                     │ │   │
│  │  │       ├─ valid ────► compute_kpis()  (Pandas)         │ │   │
│  │  │       └─ invalid ──► dead_letter table + skip         │ │   │
│  │  │                              │                        │ │   │
│  │  └──────────────────────────────┼────────────────────────┘ │   │
│  │                                 ▼                           │   │
│  │  ┌────────── PostgreSQL Writer (SQLAlchemy) ──────────────┐ │   │
│  │  │                                                        │ │   │
│  │  │  analytics_poll_summary       → UPSERT  (Type 1 SCD)  │ │   │
│  │  │  analytics_option_breakdown   → UPSERT  (Type 1 SCD)  │ │   │
│  │  │  analytics_votes_timeseries   → INSERT  (append-only) │ │   │
│  │  │  analytics_user_participation → UPSERT  (Type 1 SCD)  │ │   │
│  │  │                                                        │ │   │
│  │  │  on success ──► commit Kafka offset                    │ │   │
│  │  │  on failure ──► skip commit  (message reprocessed)     │ │   │
│  │  └────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  seed_data.py     — inserts realistic users / polls / votes        │
│  mock_producer.py — publishes fake Kafka events (no backend)       │
└────────────────────────────────────────────────────────────────────┘
```

**Processing flow per event:**
1. Kafka consumer receives a message from `vote_events` or `poll_events`
2. Message is parsed and required fields validated
3. If invalid: logged, written to `dead_letter` table, offset committed — move on
4. If valid: KPIs computed using Pandas against the event payload
5. Results upserted into the relevant analytics table(s)
6. Kafka offset committed **only after** a successful DB write — guarantees no data loss on crash

---

## 4. Kafka Topics & Message Schemas

All messages are JSON. The backend developer must produce these exact schemas.

### Topic: `vote_events`

Published when: a user successfully casts a vote.

```json
{
  "event_type": "VOTE_CAST",
  "vote_id": 12,
  "poll_id": 3,
  "option_id": 7,
  "user_id": 45,
  "voted_at": "2026-03-05T10:30:00Z"
}
```

### Topic: `poll_events`

Published when: a poll is created, updated, or expires/closes.

```json
{
  "event_type": "POLL_CREATED",
  "poll_id": 3,
  "creator_id": 10,
  "title": "What should we name the feature?",
  "poll_type": "SINGLE",
  "status": "ACTIVE",
  "expires_at": "2026-03-06T10:00:00Z",
  "created_at": "2026-03-05T09:00:00Z"
}
```

Possible `event_type` values for `poll_events`:
- `POLL_CREATED`
- `POLL_CLOSED` (expiry reached or manually closed)
- `POLL_UPDATED`

---

## 5. Dockerfile Design — Resilient Startup

The current bare `Dockerfile` starts the pipeline immediately on container start. If Postgres or Kafka hasn't finished initialising yet (which always happens on a fresh `docker-compose up`), the container crashes before it can do anything. This would break every teammate who runs `docker-compose up`.

**The fix:** a startup script (`entrypoint.sh`) that loops and waits until both Postgres and Kafka are reachable before handing off to Python.

### `entrypoint.sh` (new file)

```bash
#!/bin/sh
set -e

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
  echo "  PostgreSQL not ready — retrying in 3s"
  sleep 3
done
echo "PostgreSQL is ready."

echo "Waiting for Kafka at $KAFKA_BOOTSTRAP_SERVERS..."
KAFKA_HOST=$(echo "$KAFKA_BOOTSTRAP_SERVERS" | cut -d: -f1)
KAFKA_PORT=$(echo "$KAFKA_BOOTSTRAP_SERVERS" | cut -d: -f2)
until nc -z "$KAFKA_HOST" "$KAFKA_PORT" > /dev/null 2>&1; do
  echo "  Kafka not ready — retrying in 3s"
  sleep 3
done
echo "Kafka is ready."

echo "Starting QuickPoll analytics pipeline..."
exec python etl_pipeline.py
```

### Updated `Dockerfile`

```dockerfile
FROM python:3.11-slim

# Install pg_isready (from postgresql-client) and netcat for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
```

### `.env.example` (new file — teammates copy this to `.env`)

```
# Copy this file to .env and fill in your local values.
# .env is gitignored — never commit it.

DB_HOST=localhost
DB_PORT=5432
DB_NAME=quickpoll
DB_USER=quickpoll
DB_PASSWORD=quickpoll123
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

> **Note for teammates:** When running via `docker-compose up` you do **not** need a `.env` file — Docker Compose injects the environment variables automatically. The `.env` file is only needed if you run `python etl_pipeline.py` directly on your machine outside Docker.

---

## 6. Docker Compose Changes Required

The DevOps engineer must add the following services to `docker-compose.yml`.

### Services to Add

```yaml
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: quickpoll-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: quickpoll-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    # Health check so depends_on: condition: service_healthy works correctly.
    # Without this, Docker considers Kafka "ready" the moment the process starts,
    # not when it is actually accepting connections.
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
      interval: 15s
      timeout: 10s
      retries: 10
      start_period: 30s

  data-engineering:
    build: ./data-engineering
    container_name: quickpoll-analytics
    depends_on:
      postgres:
        condition: service_healthy   # postgres already has a healthcheck
      kafka:
        condition: service_healthy   # requires the healthcheck block above
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: quickpoll
      DB_USER: quickpoll
      DB_PASSWORD: quickpoll123
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    restart: on-failure              # auto-restart if pipeline exits unexpectedly
```

> **Why `condition: service_healthy` matters:** Without it, `depends_on` only waits for the container process to *start*, not for Postgres/Kafka to be *ready to accept connections*. Combined with `entrypoint.sh`, this gives two layers of protection — Docker waits for the health check, and the script does a final connectivity check before launching Python.

### Backend Service — Additional Environment Variable

The backend service must also know Kafka's address:

```yaml
  backend:
    environment:
      # ... existing vars ...
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
```

---

## 7. Backend Developer Coordination

The backend developer needs to make the following changes to Spring Boot. This is a **blocker** — your consumer cannot work without it.

### Dependency to add to `pom.xml`

```xml
<dependency>
  <groupId>org.springframework.kafka</groupId>
  <artifactId>spring-kafka</artifactId>
</dependency>
```

### `application.yml` addition

```yaml
spring:
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

### Events to publish

- In `VoteService` (or wherever a vote is saved): publish to `vote_events`
- In `PollService` (create, close, expire): publish to `poll_events`

---

## 8. Python Consumer Pipeline

### New Dependency to Add to `requirements.txt`

```
kafka-python==2.0.2
```

### How It Works

The pipeline shifts from a one-shot script to a **long-running consumer process** that never stops. It listens on both topics simultaneously. On each incoming message, it recomputes the affected KPIs and upserts the result into PostgreSQL.

### Load Strategy: Incremental (Event-Driven)

With Kafka, there is no scheduled full load. Every event triggers a targeted update:

| Event Received | Action Taken |
|---|---|
| `VOTE_CAST` | Update vote counts for that poll and option; recalculate participation rate |
| `POLL_CREATED` | Insert new row into analytics poll summary |
| `POLL_CLOSED` | Mark poll as closed in analytics; compute final participation rate |

### SCD Strategy: Type 1

All analytics tables use **Type 1 (overwrite)**. Because these tables are derived summaries — not the source of truth — there is no need to keep history of previous aggregated values. The raw `votes` and `polls` tables (owned by the backend) are the immutable source of truth.

The one exception is time-series tables (e.g., `analytics_votes_timeseries`), which are **append-only** by design — each row is a unique time-bucketed snapshot and is never overwritten.

---

## 9. Analytics Tables (Written by Data Engineering)

These tables live in the same `quickpoll` PostgreSQL database and are owned entirely by the data engineering pipeline.

### `analytics_poll_summary`

One row per poll. Updated on every vote event and poll event.

| Column | Type | Description |
|---|---|---|
| poll_id | BIGINT PK | Foreign key to polls |
| title | VARCHAR | Poll title |
| creator_name | VARCHAR | Name of poll creator |
| status | VARCHAR | ACTIVE / CLOSED |
| total_votes | INT | Total votes cast on this poll |
| unique_voters | INT | Distinct users who voted |
| participation_rate | FLOAT | unique_voters / total_registered_users |
| created_at | TIMESTAMPTZ | When the poll was created |
| last_updated | TIMESTAMPTZ | When this analytics row was last computed |

### `analytics_option_breakdown`

One row per poll option. Shows vote distribution.

| Column | Type | Description |
|---|---|---|
| poll_id | BIGINT | FK to polls |
| option_id | BIGINT PK | FK to poll_options |
| option_text | VARCHAR | The option label |
| vote_count | INT | Votes for this option |
| vote_percentage | FLOAT | vote_count / total_votes for this poll |
| last_updated | TIMESTAMPTZ | When last computed |

### `analytics_votes_timeseries`

Append-only. One row per time bucket (hourly). Powers trend charts.

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

## 10. KPIs Computed by the Pipeline

| KPI | Description | Source Table |
|---|---|---|
| Total votes per poll | Aggregate vote count | `analytics_poll_summary.total_votes` |
| Participation rate | % of registered users who voted on a poll | `analytics_poll_summary.participation_rate` |
| Vote distribution per option | % share of each option | `analytics_option_breakdown.vote_percentage` |
| Hourly voting trend | Votes bucketed by hour | `analytics_votes_timeseries` |
| Most active users | Users with highest vote counts | `analytics_user_participation` |
| Active vs closed polls | Count by status | Derived from `analytics_poll_summary.status` |

---

## 11. Error Handling & Reliability

| Concern | Approach |
|---|---|
| Kafka consumer crash | Kafka retains messages; consumer resumes from last committed offset on restart |
| Bad/malformed message | Log the error, skip the message, do not crash the consumer |
| DB write failure | Log the error, do not commit the Kafka offset — message will be reprocessed |
| Kafka broker down | Consumer retries connection with backoff; pipeline degrades gracefully |
| Schema mismatch | Validate required fields on arrival; send to a `dead_letter` log table if invalid |

---

## 12. Implementation Steps

Work through these in order. Steps marked **(BLOCKED)** cannot start until a dependency is met.

### Phase 1 — Infrastructure (DevOps + Backend, you coordinate)
1. DevOps adds Kafka + Zookeeper (with healthcheck) to `docker-compose.yml`
2. DevOps adds `data-engineering` service with `condition: service_healthy` and `restart: on-failure`
3. Backend dev adds `spring-kafka` dependency and publishes `vote_events` and `poll_events`
4. Agree and lock in the Kafka message schemas in Section 4 with the backend dev

### Phase 2 — Your Dockerfile & Config
5. Create `entrypoint.sh` with the Postgres + Kafka wait loop
6. Update `Dockerfile` to install `postgresql-client` + `netcat-openbsd` and use `entrypoint.sh`
7. Create `.env.example` with all environment variable defaults
8. Add `KAFKA_BOOTSTRAP_SERVERS` to `config.py`
9. Add `kafka-python==2.0.2` to `requirements.txt`

### Phase 3 — Your Pipeline Code
10. Rewrite `etl_pipeline.py` as a Kafka consumer loop
11. Implement handlers: `handle_vote_event()` and `handle_poll_event()`
12. Implement upsert logic for all 4 analytics tables
13. Add error handling: log bad messages, write to `dead_letter` table, do not commit offset on DB failure

### Phase 4 — Sample Data & Testing
14. Write `seed_data.py` to generate realistic users, polls, and votes in PostgreSQL
15. Write `mock_producer.py` to simulate Kafka events without needing the backend running
16. Run `docker-compose up` and verify `quickpoll-analytics` container waits, then starts cleanly
17. Check `docker logs quickpoll-analytics` for: "Waiting for Kafka..." → "Kafka is ready." → "Starting pipeline..."
18. Verify all 4 analytics tables are populating correctly

### Phase 5 — Integration Validation
19. Manually cast a vote via the frontend; confirm `analytics_poll_summary` updates within seconds
20. Confirm `analytics_votes_timeseries` accumulates rows over time
21. Confirm participation rate calculation is correct against raw vote counts in the `votes` table
22. Kill the `quickpoll-analytics` container mid-run; restart it; confirm no events were lost

---

## 13. File Structure After Implementation

```
data-engineering/
├── config.py                  # DB + Kafka connection config
├── etl_pipeline.py            # Kafka consumer (main process)
├── entrypoint.sh              # Startup wait script (Postgres + Kafka readiness)
├── seed_data.py               # Generates realistic sample data
├── mock_producer.py           # Simulates Kafka events for local testing
├── requirements.txt           # + kafka-python
├── Dockerfile                 # Uses entrypoint.sh; installs pg_isready + netcat
├── .env.example               # Environment variable template (committed)
├── .env                       # Your local secrets (gitignored, never committed)
├── erd.md                     # Database ERD
└── PIPELINE_ARCHITECTURE.md   # This document
```

---

## 14. Key Coordination Points (Team Dependencies)

| You Need | From Whom | Notes |
|---|---|---|
| Kafka + Zookeeper in `docker-compose.yml` (with healthcheck) | DevOps (Illiasu) | Share Section 6 exactly — healthcheck block is required |
| `data-engineering` service in `docker-compose.yml` with `condition: service_healthy` | DevOps (Illiasu) | Share Section 6 exactly |
| `vote_events` Kafka producer in Spring Boot | Backend (Abdul Basit) | Share Sections 4 and 7 |
| `poll_events` Kafka producer in Spring Boot | Backend (Abdul Basit) | Share Sections 4 and 7 |
| Locked Kafka message schemas | Backend (Abdul Basit) | Draft in Section 4 — agree before any code is written |
| `.gitignore` updated to exclude `.env` | DevOps (Illiasu) | Should already be there; confirm |

### Verifying Your Container Works for Teammates

Anyone on the team should be able to run:

```bash
docker-compose up
```

And see this sequence in your container's logs:

```
Waiting for PostgreSQL at postgres:5432...
PostgreSQL is ready.
Waiting for Kafka at kafka:9092...
Kafka is ready.
Starting QuickPoll analytics pipeline...
```

If the logs show this, your container is correctly waiting for dependencies before starting. To inspect logs at any time:

```bash
docker logs quickpoll-analytics
docker logs -f quickpoll-analytics   # follow / live stream
```
