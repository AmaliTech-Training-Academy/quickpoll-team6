"""Unit tests for scripts/mock_producer.py."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

# Make scripts importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

import mock_producer as mp  # noqa: E402


class TestPublishVoteEvents:
    """QP-15: Tests for publish_vote_events including --quiet behavior."""

    def test_sends_correct_count(self):
        producer = MagicMock()
        mp.publish_vote_events(producer, count=5)
        assert producer.send.call_count == 5
        producer.flush.assert_called_once()

    def test_event_has_required_fields(self):
        producer = MagicMock()
        mp.publish_vote_events(producer, count=1)
        call_args = producer.send.call_args
        event = call_args.kwargs["value"]
        assert event["event_type"] == "VOTE_CAST"
        assert "vote_id" in event
        assert "poll_id" in event
        assert "option_id" in event
        assert "user_id" in event
        assert "voted_at" in event

    def test_quiet_mode_reduces_logging_when_count_gt_50(self):
        """When quiet=True and count > 50, logger.info called every 100 events."""
        producer = MagicMock()
        with patch.object(mp.logger, "info") as mock_info:
            mp.publish_vote_events(producer, count=250, quiet=True)
        # Should log at 100, 200, 250 = 3 progress logs
        vote_cast_calls = [c for c in mock_info.call_args_list if "VOTE_CAST" in str(c)]
        assert len(vote_cast_calls) == 3

    def test_non_quiet_logs_every_event(self):
        """When quiet=False, each event triggers a log (for small count)."""
        producer = MagicMock()
        with patch.object(mp.logger, "info") as mock_info:
            mp.publish_vote_events(producer, count=3, quiet=False)
        vote_cast_calls = [c for c in mock_info.call_args_list if "VOTE_CAST" in str(c)]
        assert len(vote_cast_calls) == 3


class TestPublishPollEvent:
    def test_sends_poll_created(self):
        producer = MagicMock()
        mp.publish_poll_event(producer)
        producer.send.assert_called_once()
        event = producer.send.call_args.kwargs["value"]
        assert event["event_type"] == "POLL_CREATED"
        assert event["poll_id"] == 99


class TestArgparse:
    """QP-15: CLI has --votes and --quiet."""

    def test_default_votes_is_5(self):
        args = mp._parse_args([])
        assert args.votes == 5
        assert args.quiet is False

    def test_quiet_flag_parsed(self):
        args = mp._parse_args(["--quiet", "--votes", "100"])
        assert args.quiet is True
        assert args.votes == 100
