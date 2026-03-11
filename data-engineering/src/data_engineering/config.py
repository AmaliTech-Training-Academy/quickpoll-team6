"""Pipeline configuration — reads from .env or environment variables.

Environment modes (ENVIRONMENT env var):
- local-dev: Local Postgres. Uses localhost defaults.
- staging: Remote Postgres (RDS). Requires DB_* vars.
"""

from __future__ import annotations

from typing import Any

import boto3
from decouple import config
from sqlalchemy import create_engine as _sa_create_engine
from sqlalchemy.engine import Engine

# ── Environment mode ───────────────────────────────────────────────────────────
ENVIRONMENT: str = config("ENVIRONMENT", default="local-dev")

# ── Database ──────────────────────────────────────────────────────────────────
if ENVIRONMENT == "staging":
    DB_HOST: str = config("DB_HOST")
    DB_PORT: int = config("DB_PORT", default=5432, cast=int)
    DB_NAME: str = config("DB_NAME", default="quickpoll")
    DB_USER: str = config("DB_USER")
    DB_PASSWORD: str = config("DB_PASSWORD")
else:
    DB_HOST = config("DB_HOST", default="localhost")
    DB_PORT = config("DB_PORT", default=5432, cast=int)
    DB_NAME = config("DB_NAME", default="quickpoll")
    DB_USER = config("DB_USER", default="quickpoll")
    DB_PASSWORD = config("DB_PASSWORD", default="quickpoll123")

DATABASE_URL: str = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ── Pipeline ──────────────────────────────────────────────────────────────────
LOG_LEVEL: str = config("LOG_LEVEL", default="INFO")
WATERMARK_OVERLAP_MINUTES: int = config(
    "WATERMARK_OVERLAP_MINUTES", default=5, cast=int
)
FORCE_FULL_BACKFILL: bool = (
    config("FORCE_FULL_BACKFILL", default="false", cast=str).lower() == "true"
)

# DEPRECATED: Kafka config — no longer used by the main pipeline.
# Retained as stubs so the deprecated streaming.py / consumers.py modules
# can still be imported without errors (enables clean rollback).
# See: docs/KAFKA_TO_TRIGGERS_MIGRATION.md
KAFKA_BOOTSTRAP_SERVERS: str = config(
    "KAFKA_BOOTSTRAP_SERVERS", default="localhost:9092"
)
KAFKA_SASL_USERNAME: str = config("KAFKA_SASL_USERNAME", default="")
KAFKA_SASL_PASSWORD: str = config("KAFKA_SASL_PASSWORD", default="")
KAFKA_SASL_MECHANISM: str = config("KAFKA_SASL_MECHANISM", default="SCRAM-SHA-256")
KAFKA_SSL_CAFILE: str = config("KAFKA_SSL_CAFILE", default="")
KAFKA_TOPIC_VOTE_EVENTS: str = config("KAFKA_TOPIC_VOTE_EVENTS", default="vote_events")
KAFKA_TOPIC_POLL_EVENTS: str = config("KAFKA_TOPIC_POLL_EVENTS", default="poll_events")
KAFKA_GROUP_ID: str = config("KAFKA_GROUP_ID", default="quickpoll-analytics")
BACKFILL_INTERVAL_MINUTES: int = config(
    "BACKFILL_INTERVAL_MINUTES", default=30, cast=int
)


def get_kafka_security_config() -> dict[str, Any]:
    """DEPRECATED: Return security kwargs for KafkaConsumer/KafkaProducer.

    Kafka has been replaced by PostgreSQL triggers. This function is retained
    so deprecated streaming.py/consumers.py remain importable for rollback.
    """
    if not KAFKA_SASL_USERNAME:
        return {}
    out: dict[str, Any] = {
        "security_protocol": "SASL_SSL",
        "sasl_mechanism": KAFKA_SASL_MECHANISM,
        "sasl_plain_username": KAFKA_SASL_USERNAME,
        "sasl_plain_password": KAFKA_SASL_PASSWORD,
    }
    if KAFKA_SSL_CAFILE:
        out["ssl_cafile"] = KAFKA_SSL_CAFILE
    return out


# ── Dead-Letter Queue ────────────────────────────────────────────────────────
# local-dev: DLQ_DIR (folder). staging: R2 (bucket).
DLQ_DIR: str = config("DLQ_DIR", default="data/dlq")

# Cloudflare R2 (staging only)
R2_ENDPOINT_URL: str = config("R2_ENDPOINT_URL", default="")
R2_ACCESS_KEY_ID: str = config("R2_ACCESS_KEY_ID", default="")
R2_SECRET_ACCESS_KEY: str = config("R2_SECRET_ACCESS_KEY", default="")
R2_DLQ_BUCKET: str = config("R2_DLQ_BUCKET", default="quickpoll-dlq")

# ── Engine singleton ──────────────────────────────────────────────────────────
_engine: Engine | None = None


def get_engine() -> Engine:
    """Return a shared SQLAlchemy engine (created once per process)."""
    global _engine
    if _engine is None:
        _engine = _sa_create_engine(DATABASE_URL, pool_pre_ping=True)
    return _engine


# ── S3 client singleton ───────────────────────────────────────────────────────
_s3_client: Any = None


def get_s3_client() -> Any:
    """Return a shared boto3 S3 client configured for Cloudflare R2."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=R2_ENDPOINT_URL,
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        )
    return _s3_client
