"""Append-only seed script for non-empty or schema-drifted local databases.

This script is safer than ``seed_data.py`` when:
- the target database already contains rows
- identity values no longer match the static seed IDs
- the ``polls`` table is missing newer optional columns such as ``title``

It uses natural-key lookups to reuse existing rows and inserts only what is
missing. The canonical seed dataset still comes from ``scripts/seed_data.py``.

Usage (from data-engineering/ with .env present):
    uv run python scripts/seed_existing_data.py
"""

from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from importlib import import_module
from pathlib import Path
from typing import Any

from sqlalchemy import inspect, text
from sqlalchemy.engine import Connection

# Allow running as a script without installing.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

base_seed: Any = import_module("seed_data")

logger = logging.getLogger(__name__)


def _get_engine():
    """Load engine factory lazily after path bootstrap."""
    return import_module("data_engineering.config").get_engine


def _configure_logging() -> None:
    """Load logging bootstrap lazily after path bootstrap."""
    import_module("data_engineering.utils.logging").configure_logging()


@dataclass
class TableStats:
    """Inserted/reused counters for one table."""

    attempted: int = 0
    inserted: int = 0
    reused: int = 0


@dataclass
class SeedRunStats:
    """Top-level seed run stats."""

    users: TableStats = field(default_factory=TableStats)
    departments: TableStats = field(default_factory=TableStats)
    department_members: TableStats = field(default_factory=TableStats)
    polls: TableStats = field(default_factory=TableStats)
    poll_options: TableStats = field(default_factory=TableStats)
    poll_invites: TableStats = field(default_factory=TableStats)
    votes: TableStats = field(default_factory=TableStats)


@dataclass(frozen=True)
class PollSeedSpec:
    """Normalized poll seed row independent of target schema version."""

    seed_id: int
    title: str
    question: str
    description: str
    creator_seed_id: int
    expires_days: int
    active: bool
    multi_select: bool = False
    max_selections: int = 1


def _get_table_columns(conn: Connection, table_name: str) -> set[str]:
    """Return actual column names for the target table."""
    return {str(column["name"]) for column in inspect(conn).get_columns(table_name)}


def _fetch_scalar(
    conn: Connection, query: str, params: dict[str, object]
) -> int | None:
    """Return first integer scalar result if present."""
    result = conn.execute(text(query), params).scalar()
    if result is None:
        return None
    return int(result)


def _insert_then_lookup_id(
    conn: Connection,
    *,
    insert_sql: str,
    insert_params: dict[str, object],
    lookup_sql: str,
    lookup_params: dict[str, object],
) -> int:
    """Insert a row and resolve its id using a follow-up lookup."""
    conn.execute(text(insert_sql), insert_params)
    resolved_id = _fetch_scalar(conn, lookup_sql, lookup_params)
    if resolved_id is None:
        raise RuntimeError("Inserted row could not be resolved by lookup.")
    return resolved_id


def _build_insert_sql(table_name: str, ordered_columns: list[str]) -> str:
    """Return a simple INSERT statement for a fixed table and ordered columns."""
    columns_clause = ", ".join(ordered_columns)
    values_clause = ", ".join(f":{column_name}" for column_name in ordered_columns)
    return f"INSERT INTO {table_name} ({columns_clause}) VALUES ({values_clause})"


def _build_poll_specs() -> list[PollSeedSpec]:
    """Normalize standard and edge-case poll constants into one shape."""
    standard_specs = [
        PollSeedSpec(
            seed_id=poll_id,
            title=title,
            question=question,
            description=description,
            creator_seed_id=creator_seed_id,
            expires_days=30,
            active=True,
            multi_select=False,
        )
        for poll_id, title, question, description, creator_seed_id in base_seed.POLLS
    ]
    edge_specs = [
        PollSeedSpec(
            seed_id=poll_id,
            title=title,
            question=question,
            description=description,
            creator_seed_id=creator_seed_id,
            expires_days=expires_days,
            active=active,
            multi_select=False,
        )
        for (
            poll_id,
            title,
            question,
            description,
            creator_seed_id,
            expires_days,
            active,
        ) in base_seed.POLLS_EDGE
    ]
    return standard_specs + edge_specs


def _build_poll_insert_parts(
    poll_columns: set[str],
    *,
    poll: PollSeedSpec,
    creator_id: int,
    now: datetime,
) -> tuple[str, dict[str, object]]:
    """Build poll insert SQL parts that fit the live schema."""
    optional_values: dict[str, object] = {
        "title": poll.title,
        "question": poll.question,
        "description": poll.description,
        "creator_id": creator_id,
        "multi_select": poll.multi_select,
        "max_selections": poll.max_selections,
        "expires_at": now + timedelta(days=poll.expires_days),
        "active": poll.active,
        "created_at": now,
    }
    ordered_columns = [
        column_name
        for column_name in (
            "title",
            "question",
            "description",
            "creator_id",
            "multi_select",
            "max_selections",
            "expires_at",
            "active",
            "created_at",
        )
        if column_name in poll_columns
    ]
    if "question" not in ordered_columns or "creator_id" not in ordered_columns:
        raise ValueError(
            "polls table must contain at least question and creator_id columns."
        )

    values_clause = ", ".join(f":{column_name}" for column_name in ordered_columns)
    columns_clause = ", ".join(ordered_columns)
    return (
        f"INSERT INTO polls ({columns_clause}) VALUES ({values_clause})",
        {column_name: optional_values[column_name] for column_name in ordered_columns},
    )


def seed_existing(conn: Connection) -> SeedRunStats:
    """Populate the database by reusing existing rows and appending missing ones."""
    base_seed._validate_seed_references()

    stats = SeedRunStats()
    poll_columns = _get_table_columns(conn, "polls")
    poll_option_columns = _get_table_columns(conn, "poll_options")
    poll_invite_columns = _get_table_columns(conn, "poll_invites")
    vote_columns = _get_table_columns(conn, "votes")
    now = datetime.now(UTC).replace(tzinfo=None)

    user_ids_by_seed_id: dict[int, int] = {}
    department_ids_by_seed_id: dict[int, int] = {}
    department_member_ids_by_seed_id: dict[int, int] = {}
    poll_ids_by_seed_id: dict[int, int] = {}
    option_ids_by_seed_id: dict[int, int] = {}

    for seed_id, email, full_name in base_seed.USERS:
        stats.users.attempted += 1
        existing_id = _fetch_scalar(
            conn,
            "SELECT id FROM users WHERE email = :email",
            {"email": email},
        )
        if existing_id is not None:
            stats.users.reused += 1
            user_ids_by_seed_id[seed_id] = existing_id
            continue

        inserted_id = _insert_then_lookup_id(
            conn,
            insert_sql=(
                "INSERT INTO users (email, password, full_name, role, created_at) "
                "VALUES (:email, :password, :full_name, 'USER', :created_at)"
            ),
            insert_params={
                "email": email,
                "password": base_seed._PW,
                "full_name": full_name,
                "created_at": now,
            },
            lookup_sql="SELECT id FROM users WHERE email = :email",
            lookup_params={"email": email},
        )
        stats.users.inserted += 1
        user_ids_by_seed_id[seed_id] = inserted_id

    for seed_id, name in base_seed.DEPARTMENTS:
        stats.departments.attempted += 1
        existing_id = _fetch_scalar(
            conn,
            "SELECT id FROM department WHERE name = :name",
            {"name": name},
        )
        if existing_id is not None:
            stats.departments.reused += 1
            department_ids_by_seed_id[seed_id] = existing_id
            continue

        inserted_id = _insert_then_lookup_id(
            conn,
            insert_sql="INSERT INTO department (name) VALUES (:name)",
            insert_params={"name": name},
            lookup_sql="SELECT id FROM department WHERE name = :name",
            lookup_params={"name": name},
        )
        stats.departments.inserted += 1
        department_ids_by_seed_id[seed_id] = inserted_id

    for seed_id, email, department_seed_id in base_seed.DEPARTMENT_MEMBERS:
        stats.department_members.attempted += 1
        department_id = department_ids_by_seed_id[department_seed_id]
        lookup_params = {"email": email, "department_id": department_id}
        existing_id = _fetch_scalar(
            conn,
            (
                "SELECT id FROM department_members "
                "WHERE email = :email AND department_id = :department_id"
            ),
            lookup_params,
        )
        if existing_id is not None:
            stats.department_members.reused += 1
            department_member_ids_by_seed_id[seed_id] = existing_id
            continue

        inserted_id = _insert_then_lookup_id(
            conn,
            insert_sql=(
                "INSERT INTO department_members (email, department_id) "
                "VALUES (:email, :department_id)"
            ),
            insert_params=lookup_params,
            lookup_sql=(
                "SELECT id FROM department_members "
                "WHERE email = :email AND department_id = :department_id"
            ),
            lookup_params=lookup_params,
        )
        stats.department_members.inserted += 1
        department_member_ids_by_seed_id[seed_id] = inserted_id

    for poll in _build_poll_specs():
        stats.polls.attempted += 1
        creator_id = user_ids_by_seed_id[poll.creator_seed_id]
        lookup_params = {"question": poll.question, "creator_id": creator_id}
        existing_id = _fetch_scalar(
            conn,
            (
                "SELECT id FROM polls "
                "WHERE question = :question AND creator_id = :creator_id "
                "LIMIT 1"
            ),
            lookup_params,
        )
        if existing_id is not None:
            stats.polls.reused += 1
            poll_ids_by_seed_id[poll.seed_id] = existing_id
            continue

        insert_sql, insert_params = _build_poll_insert_parts(
            poll_columns,
            poll=poll,
            creator_id=creator_id,
            now=now,
        )
        inserted_id = _insert_then_lookup_id(
            conn,
            insert_sql=insert_sql,
            insert_params=insert_params,
            lookup_sql=(
                "SELECT id FROM polls "
                "WHERE question = :question AND creator_id = :creator_id "
                "LIMIT 1"
            ),
            lookup_params=lookup_params,
        )
        stats.polls.inserted += 1
        poll_ids_by_seed_id[poll.seed_id] = inserted_id

    for option_seed_id, poll_seed_id, option_text in base_seed.OPTIONS:
        stats.poll_options.attempted += 1
        poll_id = poll_ids_by_seed_id[poll_seed_id]
        lookup_params = {"poll_id": poll_id, "option_text": option_text}
        existing_id = _fetch_scalar(
            conn,
            (
                "SELECT id FROM poll_options "
                "WHERE poll_id = :poll_id AND option_text = :option_text "
                "LIMIT 1"
            ),
            lookup_params,
        )
        if existing_id is not None:
            stats.poll_options.reused += 1
            option_ids_by_seed_id[option_seed_id] = existing_id
            continue

        option_values: dict[str, object] = {
            "poll_id": poll_id,
            "option_text": option_text,
        }
        ordered_option_columns = [
            column_name
            for column_name in ("poll_id", "option_text", "vote_count")
            if column_name in poll_option_columns
        ]
        if "vote_count" in ordered_option_columns:
            option_values["vote_count"] = 0

        insert_sql = _build_insert_sql("poll_options", ordered_option_columns)
        inserted_id = _insert_then_lookup_id(
            conn,
            insert_sql=insert_sql,
            insert_params={
                column_name: option_values[column_name]
                for column_name in ordered_option_columns
            },
            lookup_sql=(
                "SELECT id FROM poll_options "
                "WHERE poll_id = :poll_id AND option_text = :option_text "
                "LIMIT 1"
            ),
            lookup_params=lookup_params,
        )
        stats.poll_options.inserted += 1
        option_ids_by_seed_id[option_seed_id] = inserted_id

    for _, poll_seed_id, member_seed_id, vote_status in base_seed.POLL_INVITES:
        stats.poll_invites.attempted += 1
        poll_id = poll_ids_by_seed_id[poll_seed_id]
        department_member_id = department_member_ids_by_seed_id[member_seed_id]
        lookup_params = {
            "poll_id": poll_id,
            "department_member_id": department_member_id,
        }
        existing_id = _fetch_scalar(
            conn,
            (
                "SELECT id FROM poll_invites "
                "WHERE poll_id = :poll_id "
                "AND department_member_id = :department_member_id "
                "LIMIT 1"
            ),
            lookup_params,
        )
        if existing_id is not None:
            stats.poll_invites.reused += 1
            continue

        invite_values: dict[str, object] = {
            "poll_id": poll_id,
            "department_member_id": department_member_id,
            "invited_at": now,
            "vote_status": vote_status,
        }
        ordered_invite_columns = [
            column_name
            for column_name in (
                "poll_id",
                "department_member_id",
                "invited_at",
                "vote_status",
            )
            if column_name in poll_invite_columns
        ]
        conn.execute(
            text(_build_insert_sql("poll_invites", ordered_invite_columns)),
            {
                column_name: invite_values[column_name]
                for column_name in ordered_invite_columns
            },
        )
        stats.poll_invites.inserted += 1

    for _, poll_seed_id, option_seed_id, user_seed_id in base_seed.VOTES:
        stats.votes.attempted += 1
        poll_id = poll_ids_by_seed_id[poll_seed_id]
        option_id = option_ids_by_seed_id[option_seed_id]
        user_id = user_ids_by_seed_id[user_seed_id]

        vote_lookup_params = {"poll_id": poll_id, "user_id": user_id}
        existing_id = _fetch_scalar(
            conn,
            (
                "SELECT id FROM votes "
                "WHERE poll_id = :poll_id AND user_id = :user_id "
                "LIMIT 1"
            ),
            vote_lookup_params,
        )
        if existing_id is not None:
            stats.votes.reused += 1
            continue

        vote_values: dict[str, object] = {
            "poll_id": poll_id,
            "option_id": option_id,
            "user_id": user_id,
            "created_at": now,
        }
        ordered_vote_columns = [
            column_name
            for column_name in ("poll_id", "option_id", "user_id", "created_at")
            if column_name in vote_columns
        ]
        conn.execute(
            text(_build_insert_sql("votes", ordered_vote_columns)),
            {
                column_name: vote_values[column_name]
                for column_name in ordered_vote_columns
            },
        )
        if "vote_count" in poll_option_columns:
            conn.execute(
                text(
                    "UPDATE poll_options "
                    "SET vote_count = COALESCE(vote_count, 0) + 1 "
                    "WHERE id = :option_id"
                ),
                {"option_id": option_id},
            )
        stats.votes.inserted += 1

    return stats


def _log_table_stats(label: str, stats: TableStats) -> None:
    """Emit consistent summary logs for one table."""
    logger.info(
        "%s: attempted=%d inserted=%d reused=%d",
        label,
        stats.attempted,
        stats.inserted,
        stats.reused,
    )


def seed() -> None:
    """Run append-only seeding against the configured database."""
    engine = _get_engine()()
    with engine.begin() as conn:
        stats = seed_existing(conn)

    _log_table_stats("Users", stats.users)
    _log_table_stats("Departments", stats.departments)
    _log_table_stats("Department members", stats.department_members)
    _log_table_stats("Polls", stats.polls)
    _log_table_stats("Poll options", stats.poll_options)
    _log_table_stats("Poll invites", stats.poll_invites)
    _log_table_stats("Votes", stats.votes)
    logger.info("Append-only seed complete.")


if __name__ == "__main__":
    _configure_logging()
    seed()
