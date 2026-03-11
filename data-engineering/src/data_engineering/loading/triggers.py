"""Deploy PostgreSQL trigger functions and triggers on startup."""

from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

# schema_triggers.sql lives at the data-engineering/ project root.
# This file is at src/data_engineering/loading/triggers.py — three parents up.
_SQL_FILE = Path(__file__).resolve().parents[3] / "schema_triggers.sql"


def deploy_triggers(engine: Engine) -> None:
    """Execute schema_triggers.sql against PostgreSQL.

    Uses CREATE OR REPLACE FUNCTION and DROP TRIGGER IF EXISTS, so this is
    safe to call on every pipeline startup (idempotent).

    Raises:
        FileNotFoundError: If schema_triggers.sql cannot be found.
        sqlalchemy.exc.SQLAlchemyError: If any SQL statement fails (the entire
            execution is rolled back via engine.begin()).
    """
    if not _SQL_FILE.exists():
        raise FileNotFoundError(
            f"Trigger SQL file not found: {_SQL_FILE}. "
            "Ensure schema_triggers.sql is present at the project root."
        )

    sql_content = _SQL_FILE.read_text(encoding="utf-8")

    with engine.begin() as conn:
        conn.execute(text(sql_content))

    logger.info("Trigger functions and triggers deployed successfully.")
