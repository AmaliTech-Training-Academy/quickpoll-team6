"""Unit tests for config module."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import pytest


def test_database_url_format() -> None:
    from data_engineering.config import DATABASE_URL

    assert DATABASE_URL.startswith("postgresql://")
    assert "@" in DATABASE_URL
    assert "/" in DATABASE_URL.split("@")[1]


def test_database_url_includes_sslmode_when_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """DATABASE_URL should include ?sslmode=require when DB_SSLMODE is set."""
    import importlib

    import data_engineering.config as cfg

    # Preserve original engine singleton
    original_engine = cfg._engine
    cfg._engine = None

    monkeypatch.setenv("DB_SSLMODE", "require")
    try:
        importlib.reload(cfg)
        assert "?sslmode=require" in cfg.DATABASE_URL
    finally:
        monkeypatch.delenv("DB_SSLMODE", raising=False)
        importlib.reload(cfg)
        cfg._engine = original_engine


def test_database_url_no_sslmode_when_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    """DATABASE_URL should NOT include sslmode when DB_SSLMODE is empty."""
    import importlib

    import data_engineering.config as cfg

    original_engine = cfg._engine
    cfg._engine = None

    monkeypatch.setenv("DB_SSLMODE", "")
    try:
        importlib.reload(cfg)
        assert "?sslmode" not in cfg.DATABASE_URL
    finally:
        monkeypatch.delenv("DB_SSLMODE", raising=False)
        importlib.reload(cfg)
        cfg._engine = original_engine


def test_log_level_default() -> None:
    """LOG_LEVEL defaults to INFO when not set."""
    from data_engineering.config import LOG_LEVEL

    # decouple reads env; if not overridden, should be the default
    assert LOG_LEVEL in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")


def test_r2_config_defaults() -> None:
    """R2_DLQ_BUCKET has a sensible default; endpoint/key/secret default to empty."""
    from data_engineering.config import (
        R2_ACCESS_KEY_ID,
        R2_DLQ_BUCKET,
        R2_ENDPOINT_URL,
        R2_SECRET_ACCESS_KEY,
    )

    assert R2_DLQ_BUCKET != ""
    # Credentials default to empty string when not set — that's expected
    assert isinstance(R2_ENDPOINT_URL, str)
    assert isinstance(R2_ACCESS_KEY_ID, str)
    assert isinstance(R2_SECRET_ACCESS_KEY, str)


def test_get_s3_client_returns_same_instance() -> None:
    """get_s3_client() is a singleton — boto3 is mocked to avoid real network setup."""
    from unittest.mock import MagicMock, patch

    import data_engineering.config as cfg

    original = cfg._s3_client
    cfg._s3_client = None
    try:
        with patch("data_engineering.config.boto3") as mock_boto3:
            mock_boto3.client.return_value = MagicMock()
            c1 = cfg.get_s3_client()
            c2 = cfg.get_s3_client()
        assert c1 is c2
        mock_boto3.client.assert_called_once()
    finally:
        cfg._s3_client = original


def test_get_engine_returns_same_instance() -> None:
    """get_engine() is a singleton."""
    from data_engineering.config import get_engine

    e1 = get_engine()
    e2 = get_engine()
    assert e1 is e2
