# PR Merge Order — Kafka → PostgreSQL Triggers Migration

> **For the reviewer**: These 6 PRs are part of a single migration and **must be merged in the order listed below**. Each PR targets the previous PR's branch (not `develop` directly), so merging out of order will produce incorrect diffs and broken history. Merge one, wait for CI to pass, then move to the next.

---

## Merge Sequence

### ✅ Step 1 — Merge First
**PR #62: `feat(data-engineering): add PostgreSQL trigger functions [QP-1]`**
[https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/62](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/62)

- Adds `schema_triggers.sql` — the PL/pgSQL trigger functions that replace Kafka
- 4 analytics functions + 5 triggers, all idempotent (`CREATE OR REPLACE` / `DROP IF EXISTS`)
- Base PR — everything else depends on this

---

### ✅ Step 2 — Merge Second
**PR #63: `feat(data-engineering): add trigger deployment module [QP-2]`**
[https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/63](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/63)

- Adds `src/data_engineering/loading/triggers.py`
- Python function `deploy_triggers(engine)` that executes `schema_triggers.sql` on startup
- Depends on PR #62 (needs the SQL file to exist)

---

### ✅ Step 3 — Merge Third
**PR #64: `refactor(data-engineering): replace Kafka streaming with trigger deployment [QP-3]`**
[https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/64](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/64)

- Wires `deploy_triggers()` into `main.py` — pipeline now exits after backfill instead of running a 24/7 Kafka consumer
- Removes Kafka from `config.py` (kept as deprecated stubs for rollback safety)
- Marks `streaming.py` and `consumers.py` as DEPRECATED
- Depends on PR #63 (calls `deploy_triggers`)

---

### ✅ Step 4 — Merge Fourth
**PR #65: `chore(data-engineering): remove Kafka from entrypoint and Docker [QP-4]`**
[https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/65](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/65)

- Removes Kafka `nc -z` readiness check from `entrypoint.sh`
- Removes `netcat-openbsd` from `Dockerfile`
- Removes `zookeeper` + `kafka` services from `docker-compose.kafka-dev.yml`
- Depends on PR #64 (pipeline no longer needs Kafka at boot)

---

### ✅ Step 5 — Merge Fifth
**PR #66: `chore(data-engineering): remove kafka-python dependency [QP-5]`**
[https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/66](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/66)

- Removes `kafka-python==2.0.2` from `requirements.txt` and `pyproject.toml`
- Adds `try/except ImportError` guards to deprecated Kafka modules so they stay importable
- Deprecated Kafka tests skip cleanly (`pytest.importorskip`) instead of failing
- **Test result**: 122 passed, 1 skipped
- Depends on PR #65 (Docker no longer needs kafka-python at runtime)

---

### ✅ Step 6 — Merge Last
**PR #67: `test(data-engineering): add unit tests for trigger deployment [QP-6]`**
[https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/67](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/67)

- Adds `tests/unit/test_triggers.py` — 10 unit tests, no live DB required
- Covers: SQL file existence, function/trigger presence, idempotency markers, `engine.begin()` usage, `FileNotFoundError` on missing SQL
- **Final PR** — migration is complete after this merges

---

## Summary Table

| Order | PR | Title | Risk |
|-------|----|-------|------|
| 1st | [#62](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/62) | Add PostgreSQL trigger functions | 🟢 New file |
| 2nd | [#63](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/63) | Add trigger deployment module | 🟢 New file |
| 3rd | [#64](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/64) | Replace Kafka streaming | 🟡 Modifies `main.py`, `config.py` |
| 4th | [#65](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/65) | Remove Kafka from Docker | 🟢 Config/infra only |
| 5th | [#66](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/66) | Remove kafka-python dependency | 🟢 Dependency cleanup |
| 6th | [#67](https://github.com/AmaliTech-Training-Academy/quickpoll-team6/pull/67) | Add trigger unit tests | 🟢 New tests only |

---

## What This Migration Does

Replaces a 24/7 Kafka consumer loop with PostgreSQL trigger functions that fire on `INSERT`/`UPDATE` events. Outcome: **~$31/month saved** (no more Kafka + Zookeeper containers on staging), simpler deployment, and a pipeline that exits cleanly after backfill instead of running forever.
