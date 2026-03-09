"""Unit tests for consumers module (DLQ writer + dead_letter table health check)."""

from __future__ import annotations

import logging
from unittest.mock import MagicMock, patch

import pytest

from data_engineering.ingestion.consumers import check_dlq_bucket, write_to_dlq


def _mock_engine() -> MagicMock:
    """Return a mock engine with connect() returning a context manager."""
    conn = MagicMock()
    conn.execute.return_value = None
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)

    engine = MagicMock()
    engine.connect.return_value = conn
    engine.begin.return_value = conn
    return engine


# ── write_to_dlq ──────────────────────────────────────────────────────────────


def test_write_to_dlq_calls_execute() -> None:
    engine = _mock_engine()
    with patch("data_engineering.ingestion.consumers.get_engine", return_value=engine):
        write_to_dlq({"event_type": "VOTE_CAST", "poll_id": 1})

    engine.begin.assert_called_once()
    conn = engine.begin.return_value
    conn.execute.assert_called_once()
    call_args = conn.execute.call_args
    stmt = call_args[0][0]
    assert "VOTE_CAST" in str(stmt.compile().params) or "event_type" in str(stmt)


def test_write_to_dlq_body_is_valid_json() -> None:
    import json

    engine = _mock_engine()
    event = {"event_type": "POLL_CREATED", "poll_id": 5}
    with patch("data_engineering.ingestion.consumers.get_engine", return_value=engine):
        write_to_dlq(event)

    conn = engine.begin.return_value
    conn.execute.assert_called_once()
    call_args = conn.execute.call_args
    stmt = call_args[0][0]
    params = stmt.compile().params
    raw = params.get("raw_payload", params.get("raw_payload_1", ""))
    parsed = json.loads(raw)
    assert parsed["poll_id"] == 5


def test_write_to_dlq_unknown_event_type() -> None:
    engine = _mock_engine()
    with patch("data_engineering.ingestion.consumers.get_engine", return_value=engine):
        write_to_dlq("not-a-dict")

    conn = engine.begin.return_value
    conn.execute.assert_called_once()
    call_args = conn.execute.call_args
    stmt = call_args[0][0]
    params = stmt.compile().params
    event_type = params.get("event_type", params.get("event_type_1", ""))
    assert event_type == "unknown"


def test_write_to_dlq_db_error_does_not_raise() -> None:
    """A DB error must not propagate — DLQ failure is non-fatal."""
    engine = _mock_engine()
    conn = MagicMock()
    conn.execute.side_effect = Exception("DB connection failed")
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)
    engine.begin.return_value = conn

    with patch("data_engineering.ingestion.consumers.get_engine", return_value=engine):
        write_to_dlq({"event_type": "VOTE_CAST"})  # must not raise


def test_write_to_dlq_db_error_is_logged(caplog: pytest.LogCaptureFixture) -> None:
    engine = _mock_engine()
    conn = MagicMock()
    conn.execute.side_effect = Exception("DB connection failed")
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)
    engine.begin.return_value = conn

    with (
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
        caplog.at_level(logging.ERROR, logger="data_engineering.ingestion.consumers"),
    ):
        write_to_dlq({"event_type": "VOTE_CAST"})

    assert "Failed to write event to dead_letter_events" in caplog.text


# ── check_dlq_bucket ──────────────────────────────────────────────────────────


def test_check_dlq_bucket_success_logs_info(caplog: pytest.LogCaptureFixture) -> None:
    engine = _mock_engine()
    with (
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
        caplog.at_level(logging.INFO, logger="data_engineering.ingestion.consumers"),
    ):
        check_dlq_bucket()

    assert "reachable" in caplog.text or "Dead-letter" in caplog.text


def test_check_dlq_bucket_error_logs_warning(caplog: pytest.LogCaptureFixture) -> None:
    engine = MagicMock()
    conn = MagicMock()
    conn.execute.side_effect = Exception("Table does not exist")
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)
    engine.connect.return_value = conn

    with (
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
        caplog.at_level(logging.WARNING, logger="data_engineering.ingestion.consumers"),
    ):
        check_dlq_bucket()  # must not raise

    assert "not reachable" in caplog.text or "may be lost" in caplog.text


def test_check_dlq_bucket_error_does_not_raise() -> None:
    engine = MagicMock()
    conn = MagicMock()
    conn.execute.side_effect = Exception("Connection refused")
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)
    engine.connect.return_value = conn

    with patch("data_engineering.ingestion.consumers.get_engine", return_value=engine):
        check_dlq_bucket()  # must not raise
