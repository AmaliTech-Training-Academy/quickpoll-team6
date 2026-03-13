"""Unit tests for append-only seed script against existing/legacy schemas."""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

# Make scripts importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

import seed_existing_data as sed  # noqa: E402


def _create_schema(
    *, include_poll_title: bool, include_max_selections: bool = False
) -> object:
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    poll_title_column = '"title" VARCHAR NOT NULL,' if include_poll_title else ""
    max_selections_column = (
        '"max_selections" INTEGER NOT NULL,' if include_max_selections else ""
    )

    schema_sql = f"""
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR UNIQUE NOT NULL,
      password VARCHAR NOT NULL,
      full_name VARCHAR,
      role VARCHAR NOT NULL,
      created_at TIMESTAMP
    );

    CREATE TABLE department (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR NOT NULL
    );

    CREATE TABLE department_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR NOT NULL,
      department_id INTEGER
    );

    CREATE TABLE polls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      {poll_title_column}
      description VARCHAR(1000) NOT NULL,
      question VARCHAR NOT NULL,
      creator_id INTEGER,
      multi_select BOOLEAN,
      {max_selections_column}
      expires_at TIMESTAMP,
      active BOOLEAN DEFAULT 1,
      created_at TIMESTAMP
    );

    CREATE TABLE poll_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER,
      option_text VARCHAR NOT NULL,
      vote_count INT DEFAULT 0
    );

    CREATE TABLE poll_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER,
      department_member_id INTEGER,
      invited_at TIMESTAMP,
      vote_status VARCHAR DEFAULT 'PENDING'
    );

    CREATE TABLE votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id INTEGER,
      option_id INTEGER,
      user_id INTEGER,
      created_at TIMESTAMP
    );
    """
    with engine.begin() as conn:
        for statement in schema_sql.split(";"):
            cleaned = statement.strip()
            if cleaned:
                conn.execute(text(cleaned))
    return engine


def test_seed_existing_reuses_rows_on_non_empty_database() -> None:
    engine = _create_schema(include_poll_title=True)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (email, password, full_name, role, created_at)
                VALUES (
                    'admin@quickpoll.com',
                    'x',
                    'Admin User',
                    'USER',
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO department (name)
                VALUES ('Engineering')
                """
            )
        )

        stats = sed.seed_existing(conn)

        assert stats.users.reused >= 1
        assert stats.departments.reused >= 1
        assert stats.polls.inserted == len(sed._build_poll_specs())

        user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one()
        poll_count = conn.execute(text("SELECT COUNT(*) FROM polls")).scalar_one()
        option_count = conn.execute(
            text("SELECT COUNT(*) FROM poll_options")
        ).scalar_one()

        assert user_count == len(sed.base_seed.USERS)
        assert poll_count == len(sed._build_poll_specs())
        assert option_count == len(sed.base_seed.OPTIONS)


def test_seed_existing_supports_legacy_polls_schema_without_title() -> None:
    engine = _create_schema(include_poll_title=False)

    with engine.begin() as conn:
        stats = sed.seed_existing(conn)

        poll_count = conn.execute(text("SELECT COUNT(*) FROM polls")).scalar_one()
        vote_count = conn.execute(text("SELECT COUNT(*) FROM votes")).scalar_one()

        assert stats.polls.inserted == len(sed._build_poll_specs())
        assert poll_count == len(sed._build_poll_specs())
        assert vote_count == len(sed.base_seed.VOTES)


def test_seed_existing_supports_backend_polls_schema_with_max_selections() -> None:
    engine = _create_schema(
        include_poll_title=False,
        include_max_selections=True,
    )

    with engine.begin() as conn:
        stats = sed.seed_existing(conn)

        max_selections_values = (
            conn.execute(
                text(
                    "SELECT DISTINCT max_selections FROM polls ORDER BY max_selections"
                )
            )
            .scalars()
            .all()
        )

        assert stats.polls.inserted == len(sed._build_poll_specs())
        assert max_selections_values == [1]


def test_build_poll_insert_parts_omits_title_when_missing() -> None:
    poll = sed._build_poll_specs()[0]

    insert_sql, insert_params = sed._build_poll_insert_parts(
        {"question", "description", "creator_id", "active", "created_at"},
        poll=poll,
        creator_id=99,
        now=sed.datetime(2026, 3, 13),
    )

    assert "title" not in insert_sql
    assert "title" not in insert_params
    assert insert_params["question"] == poll.question


def test_build_poll_insert_parts_includes_max_selections_when_present() -> None:
    poll = sed._build_poll_specs()[0]

    insert_sql, insert_params = sed._build_poll_insert_parts(
        {
            "question",
            "description",
            "creator_id",
            "active",
            "created_at",
            "max_selections",
        },
        poll=poll,
        creator_id=99,
        now=sed.datetime(2026, 3, 13),
    )

    assert "max_selections" in insert_sql
    assert insert_params["max_selections"] == 1
