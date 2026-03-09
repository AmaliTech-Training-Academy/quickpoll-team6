"""Kafka consumer factory and dead-letter queue writer."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from kafka import KafkaConsumer

from data_engineering.config import (
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_GROUP_ID,
    KAFKA_TOPIC_POLL_EVENTS,
    KAFKA_TOPIC_VOTE_EVENTS,
    get_engine,
)
from data_engineering.loading.models import dead_letter_events

logger = logging.getLogger(__name__)


def create_consumer() -> KafkaConsumer:
    """
    Create and return a Kafka consumer subscribed to vote and poll event topics.

    auto_offset_reset="earliest" ensures no events are missed on restart.
    enable_auto_commit=False lets the pipeline commit only after a successful
    DB write, providing at-least-once delivery guarantees.
    """
    return KafkaConsumer(
        KAFKA_TOPIC_VOTE_EVENTS,
        KAFKA_TOPIC_POLL_EVENTS,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        group_id=KAFKA_GROUP_ID,
        auto_offset_reset="earliest",
        enable_auto_commit=False,
        max_poll_records=50,
        max_poll_interval_ms=600_000,  # 10 min — each event triggers DB I/O
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )


def check_dlq_bucket() -> None:
    """Verify the dead_letter_events table exists. Non-fatal on failure."""
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
    """Insert a failed event into the dead_letter_events table (QP-12)."""
    event_type = "unknown"
    if isinstance(event, dict):
        event_type = event.get("event_type", "unknown")

    raw_payload = json.dumps(event, default=str)

    try:
        stmt = dead_letter_events.insert().values(
            event_type=event_type,
            raw_payload=raw_payload,
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
