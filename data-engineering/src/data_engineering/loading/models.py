"""SQLAlchemy table definitions for all four analytics tables."""

from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.engine import Engine

metadata = MetaData()

analytics_poll_summary = Table(
    "analytics_poll_summary",
    metadata,
    Column("poll_id", BigInteger, primary_key=True),
    Column("creator_id", BigInteger),
    Column("title", String(255), nullable=False),
    Column("description", Text),
    Column("creator_name", String(255)),
    Column("status", String(50)),
    Column("max_selections", Integer, server_default="1"),
    Column("expires_at", DateTime),
    Column("total_votes", Integer, server_default="0"),
    Column("unique_voters", Integer, server_default="0"),
    Column("participation_rate", Float, server_default="0"),
    Column("created_at", DateTime),
    Column("last_updated", DateTime, server_default=text("NOW()")),
    Index(
        "idx_analytics_poll_summary_creator_status_updated",
        "creator_id",
        "status",
        "last_updated",
    ),
    Index("idx_analytics_poll_summary_last_updated", "last_updated"),
)

analytics_option_breakdown = Table(
    "analytics_option_breakdown",
    metadata,
    Column("option_id", BigInteger, primary_key=True),
    Column("poll_id", BigInteger, nullable=False),
    Column("option_text", String(500)),
    Column("vote_count", Integer, server_default="0"),
    Column("vote_percentage", Float, server_default="0"),
    Column("last_updated", DateTime, server_default=text("NOW()")),
    Index("idx_analytics_option_breakdown_poll_id", "poll_id"),
)

analytics_votes_timeseries = Table(
    "analytics_votes_timeseries",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("poll_id", BigInteger, nullable=False),
    Column("bucket_time", DateTime, nullable=False),
    Column("votes_in_bucket", Integer, server_default="0"),
    Column("recorded_at", DateTime, server_default=text("NOW()")),
    UniqueConstraint("poll_id", "bucket_time", name="uq_timeseries_poll_bucket"),
)

analytics_user_participation = Table(
    "analytics_user_participation",
    metadata,
    Column("user_id", BigInteger, primary_key=True),
    Column("user_name", String(255)),
    Column("total_votes_cast", Integer, server_default="0"),
    Column("polls_participated", Integer, server_default="0"),
    Column("polls_created", Integer, server_default="0"),
    Column("last_active", DateTime),
    Column("last_updated", DateTime, server_default=text("NOW()")),
    Index(
        "idx_analytics_user_participation_votes_last_active",
        "total_votes_cast",
        "last_active",
    ),
)

pipeline_watermarks = Table(
    "pipeline_watermarks",
    metadata,
    Column("entity_name", String(50), primary_key=True),
    Column("high_watermark", DateTime, nullable=False),
    Column("updated_at", DateTime, server_default=text("NOW()")),
)

dead_letter_events = Table(
    "dead_letter_events",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("event_type", String(50)),
    Column("raw_payload", Text, nullable=False),  # JSON stored as text
    Column("error_message", String(500)),
    Column("created_at", DateTime, server_default=text("NOW()")),
)


def create_analytics_tables(engine: Engine) -> None:
    """Create all analytics tables in PostgreSQL if they don't exist yet."""
    metadata.create_all(engine, checkfirst=True)
