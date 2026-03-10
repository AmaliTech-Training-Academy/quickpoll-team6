"""Unit tests for consumers module (DLQ writer + dead_letter table health check)."""

from __future__ import annotations

import json
import logging
from pathlib import Path
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


# ── write_to_dlq (local-dev: folder) ──────────────────────────────────────────


def test_write_to_dlq_local_folder_writes_file(tmp_path: Path) -> None:
    """local-dev: write_to_dlq writes JSON file to DLQ_DIR."""
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "local-dev"),
        patch("data_engineering.ingestion.consumers.DLQ_DIR", str(tmp_path)),
    ):
        write_to_dlq({"event_type": "VOTE_CAST", "poll_id": 1})

    files = list(tmp_path.glob("dlq_*.json"))
    assert len(files) == 1
    content = json.loads(files[0].read_text())
    assert content["event_type"] == "VOTE_CAST"
    assert content["raw_payload"]["poll_id"] == 1


def test_write_to_dlq_local_folder_unknown_event_type(tmp_path: Path) -> None:
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "local-dev"),
        patch("data_engineering.ingestion.consumers.DLQ_DIR", str(tmp_path)),
    ):
        write_to_dlq("not-a-dict")

    files = list(tmp_path.glob("dlq_*.json"))
    assert len(files) == 1
    content = json.loads(files[0].read_text())
    assert content["event_type"] == "unknown"


def test_write_to_dlq_local_folder_error_does_not_raise(tmp_path: Path) -> None:
    """DLQ folder write failure must not propagate."""
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "local-dev"),
        patch("data_engineering.ingestion.consumers.DLQ_DIR", "/nonexistent/readonly"),
        patch("data_engineering.ingestion.consumers.Path") as mock_path,
    ):
        mock_path.return_value.mkdir.side_effect = PermissionError("read-only")
        write_to_dlq({"event_type": "VOTE_CAST"})  # must not raise


def test_write_to_dlq_local_folder_error_is_logged(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "local-dev"),
        patch("data_engineering.ingestion.consumers.DLQ_DIR", str(tmp_path)),
        patch.object(Path, "write_text", side_effect=OSError("disk full")),
        caplog.at_level(logging.ERROR, logger="data_engineering.ingestion.consumers"),
    ):
        write_to_dlq({"event_type": "VOTE_CAST"})

    assert "Failed to write event to DLQ folder" in caplog.text


# ── write_to_dlq (staging: Postgres) ──────────────────────────────────────────


def test_write_to_dlq_staging_postgres_calls_execute() -> None:
    engine = _mock_engine()
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
    ):
        write_to_dlq({"event_type": "VOTE_CAST", "poll_id": 1})

    conn = engine.begin.return_value
    conn.execute.assert_called_once()
    call_args = conn.execute.call_args
    stmt = call_args[0][0]
    params = stmt.compile().params
    assert params.get("event_type") == "VOTE_CAST"


def test_write_to_dlq_staging_postgres_body_is_valid_json() -> None:
    engine = _mock_engine()
    event = {"event_type": "POLL_CREATED", "poll_id": 5}
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
    ):
        write_to_dlq(event)

    conn = engine.begin.return_value
    call_args = conn.execute.call_args
    stmt = call_args[0][0]
    params = stmt.compile().params
    raw = params.get("raw_payload", params.get("raw_payload_1", ""))
    parsed = json.loads(raw)
    assert parsed["raw_payload"]["poll_id"] == 5


def test_write_to_dlq_staging_postgres_error_does_not_raise() -> None:
    engine = _mock_engine()
    conn = MagicMock()
    conn.execute.side_effect = Exception("DB connection failed")
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)
    engine.begin.return_value = conn

    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
    ):
        write_to_dlq({"event_type": "VOTE_CAST"})  # must not raise


def test_write_to_dlq_staging_postgres_error_is_logged(
    caplog: pytest.LogCaptureFixture,
) -> None:
    engine = _mock_engine()
    conn = MagicMock()
    conn.execute.side_effect = Exception("DB connection failed")
    conn.__enter__ = MagicMock(return_value=conn)
    conn.__exit__ = MagicMock(return_value=None)
    engine.begin.return_value = conn

    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
        caplog.at_level(logging.ERROR, logger="data_engineering.ingestion.consumers"),
    ):
        write_to_dlq({"event_type": "VOTE_CAST"})

    assert "Failed to write event to dead_letter_events" in caplog.text


# ── check_dlq_bucket ──────────────────────────────────────────────────────────


def test_check_dlq_bucket_local_folder_success(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "local-dev"),
        patch("data_engineering.ingestion.consumers.DLQ_DIR", "data/dlq"),
        caplog.at_level(logging.INFO, logger="data_engineering.ingestion.consumers"),
    ):
        check_dlq_bucket()

    assert "writable" in caplog.text or "Dead-letter" in caplog.text


def test_check_dlq_bucket_staging_postgres_success(
    caplog: pytest.LogCaptureFixture,
) -> None:
    engine = _mock_engine()
    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
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
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
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

    with (
        patch("data_engineering.ingestion.consumers.ENVIRONMENT", "staging"),
        patch("data_engineering.config.R2_ENDPOINT_URL", ""),
        patch("data_engineering.ingestion.consumers.get_engine", return_value=engine),
    ):
        check_dlq_bucket()  # must not raise
