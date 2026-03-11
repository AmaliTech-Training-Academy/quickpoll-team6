"""DEPRECATED: Kafka consumer factory and dead-letter queue writer.

The Kafka consumer is no longer used by the main pipeline. PostgreSQL trigger
functions in schema_triggers.sql handle real-time analytics updates.
This file is retained for reference and as a rollback path.

See: docs/KAFKA_TO_TRIGGERS_MIGRATION.md
"""

from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path
from typing import Any

from kafka import KafkaConsumer
from sqlalchemy import select

from data_engineering.config import (
    DLQ_DIR,
    ENVIRONMENT,
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_GROUP_ID,
    KAFKA_TOPIC_POLL_EVENTS,
    KAFKA_TOPIC_VOTE_EVENTS,
    R2_DLQ_BUCKET,
    get_engine,
    get_kafka_security_config,
    get_s3_client,
)
from data_engineering.loading.models import dead_letter_events

logger = logging.getLogger(__name__)


def create_consumer() -> KafkaConsumer:
    """
    Create and return a Kafka consumer subscribed to vote and poll event topics.

    auto_offset_reset="earliest" ensures no events are missed on restart.
    enable_auto_commit=False lets the pipeline commit only after a successful
    DB write, providing at-least-once delivery guarantees.

    Uses SASL_SSL when KAFKA_SASL_USERNAME is set (e.g. Digital Ocean Kafka).
    """
    common = {
        "bootstrap_servers": KAFKA_BOOTSTRAP_SERVERS,
        "group_id": KAFKA_GROUP_ID,
        "auto_offset_reset": "earliest",
        "enable_auto_commit": False,
        "max_poll_records": 50,
        "max_poll_interval_ms": 600_000,  # 10 min — each event triggers DB I/O
        "value_deserializer": lambda m: json.loads(m.decode("utf-8")),
        **get_kafka_security_config(),
    }
    return KafkaConsumer(
        KAFKA_TOPIC_VOTE_EVENTS,
        KAFKA_TOPIC_POLL_EVENTS,
        **common,
    )


def check_dlq_bucket() -> None:
    """Verify DLQ storage is reachable. Non-fatal on failure."""
    if ENVIRONMENT == "local-dev":
        _check_dlq_folder()
    else:
        _check_dlq_staging()


def _check_dlq_folder() -> None:
    """Verify DLQ folder exists and is writable (local-dev)."""
    try:
        path = Path(DLQ_DIR)
        path.mkdir(parents=True, exist_ok=True)
        (path / ".write_test").write_text("")
        (path / ".write_test").unlink()
        logger.info("Dead-letter folder '%s' is writable.", DLQ_DIR)
    except Exception as exc:
        logger.warning(
            "Dead-letter folder '%s' not writable (%s). Failed events may be lost.",
            DLQ_DIR,
            exc,
        )


def _check_dlq_staging() -> None:
    """Verify R2 bucket or Postgres DLQ table is reachable (staging)."""
    from data_engineering.config import R2_ENDPOINT_URL

    if R2_ENDPOINT_URL:
        try:
            get_s3_client().head_bucket(Bucket=R2_DLQ_BUCKET)
            logger.info("Dead-letter R2 bucket '%s' is reachable.", R2_DLQ_BUCKET)
        except Exception as exc:
            logger.warning(
                "R2 bucket '%s' not reachable (%s). Failed events may be lost.",
                R2_DLQ_BUCKET,
                exc,
            )
    else:
        try:
            with get_engine().connect() as conn:
                conn.execute(select(dead_letter_events).limit(1))
            logger.info("Dead-letter table 'dead_letter_events' is reachable.")
        except Exception as exc:
            logger.warning(
                "Dead-letter table not reachable (%s). Failed events may be lost.",
                exc,
            )


def write_to_dlq(event: Any, error_message: str | None = None) -> None:
    """Write failed event to DLQ. local-dev: folder. staging: R2 or Postgres (QP-12)."""
    event_type = "unknown"
    if isinstance(event, dict):
        event_type = event.get("event_type", "unknown")

    payload = {
        "event_type": event_type,
        "raw_payload": event,
        "error_message": error_message,
    }
    raw_json = json.dumps(payload, default=str)

    if ENVIRONMENT == "local-dev":
        _write_dlq_to_folder(event_type, raw_json)
    else:
        _write_dlq_to_staging(event_type, raw_json, error_message)


def _write_dlq_to_folder(event_type: str, raw_json: str) -> None:
    """Write DLQ event to local folder (local-dev)."""
    try:
        path = Path(DLQ_DIR)
        path.mkdir(parents=True, exist_ok=True)
        filename = f"dlq_{event_type}_{uuid.uuid4().hex[:8]}.json"
        filepath = path / filename
        filepath.write_text(raw_json, encoding="utf-8")
        logger.warning(
            "Event moved to DLQ folder: event_type=%s file=%s",
            event_type,
            filepath,
        )
    except Exception as exc:
        logger.error("Failed to write event to DLQ folder: %s", exc)


def _write_dlq_to_staging(
    event_type: str, raw_json: str, error_message: str | None = None
) -> None:
    """Write DLQ event to R2 or Postgres (staging)."""
    from data_engineering.config import R2_ENDPOINT_URL

    if R2_ENDPOINT_URL:
        try:
            key = f"dlq/{event_type}/{uuid.uuid4().hex}.json"
            get_s3_client().put_object(
                Bucket=R2_DLQ_BUCKET,
                Key=key,
                Body=raw_json.encode("utf-8"),
                ContentType="application/json",
            )
            logger.warning(
                "Event moved to R2 DLQ: event_type=%s key=%s",
                event_type,
                key,
            )
        except Exception as exc:
            logger.error("Failed to write event to R2 DLQ: %s", exc)
    else:
        try:
            stmt = dead_letter_events.insert().values(
                event_type=event_type,
                raw_payload=raw_json,
                error_message=error_message,
            )
            with get_engine().begin() as conn:
                conn.execute(stmt)
            logger.warning(
                "Event moved to dead_letter_events: event_type=%s",
                event_type,
            )
        except Exception as exc:
            logger.error("Failed to write event to dead_letter_events: %s", exc)
