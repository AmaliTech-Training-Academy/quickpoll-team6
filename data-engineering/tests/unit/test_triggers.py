"""Unit tests for data_engineering.loading.triggers.deploy_triggers."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from data_engineering.loading.triggers import _SQL_FILE, deploy_triggers


class TestSqlFileExists:
    def test_schema_triggers_sql_exists(self) -> None:
        """schema_triggers.sql must be present at the project root."""
        assert _SQL_FILE.exists(), f"SQL file not found at {_SQL_FILE}"

    def test_sql_file_is_non_empty(self) -> None:
        assert _SQL_FILE.stat().st_size > 0


class TestSqlFileContent:
    def _content(self) -> str:
        return _SQL_FILE.read_text(encoding="utf-8")

    def test_contains_all_four_functions(self) -> None:
        content = self._content()
        for fn in (
            "fn_refresh_poll_summary",
            "fn_refresh_option_breakdown",
            "fn_refresh_votes_timeseries",
            "fn_refresh_user_participation",
        ):
            assert fn in content, f"Missing function: {fn}"

    def test_contains_all_triggers(self) -> None:
        content = self._content()
        for trg in (
            "trg_vote_after_insert",
            "trg_poll_after_insert",
            "trg_poll_after_update",
            "trg_user_after_insert",
        ):
            assert trg in content, f"Missing trigger: {trg}"

    def test_functions_use_create_or_replace(self) -> None:
        content = self._content()
        assert "CREATE OR REPLACE FUNCTION" in content

    def test_triggers_use_drop_if_exists(self) -> None:
        content = self._content()
        assert "DROP TRIGGER IF EXISTS" in content


class TestDeployTriggers:
    def _mock_engine(self) -> MagicMock:
        conn = MagicMock()
        conn.__enter__ = MagicMock(return_value=conn)
        conn.__exit__ = MagicMock(return_value=False)
        engine = MagicMock()
        engine.begin.return_value = conn
        return engine

    def test_executes_sql_on_engine(self) -> None:
        """deploy_triggers must call engine.begin() and conn.execute()."""
        engine = self._mock_engine()
        deploy_triggers(engine)
        engine.begin.assert_called_once()
        conn = engine.begin.return_value
        conn.execute.assert_called_once()

    def test_uses_engine_begin_transaction(self) -> None:
        """SQL must be executed inside engine.begin() context manager."""
        engine = self._mock_engine()
        deploy_triggers(engine)
        engine.begin.assert_called_once_with()

    def test_raises_file_not_found_when_sql_missing(self) -> None:
        """FileNotFoundError raised (with helpful message) if SQL file absent."""
        engine = self._mock_engine()
        with (
            patch(
                "data_engineering.loading.triggers._SQL_FILE",
                Path("/nonexistent/schema_triggers.sql"),
            ),
            pytest.raises(FileNotFoundError, match="schema_triggers.sql"),
        ):
            deploy_triggers(engine)

    def test_no_db_call_when_sql_file_missing(self) -> None:
        """engine must not be touched if the SQL file is absent."""
        engine = self._mock_engine()
        with (
            patch(
                "data_engineering.loading.triggers._SQL_FILE",
                Path("/nonexistent/schema_triggers.sql"),
            ),
            pytest.raises(FileNotFoundError),
        ):
            deploy_triggers(engine)
        engine.begin.assert_not_called()
