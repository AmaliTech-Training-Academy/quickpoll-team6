"""Unit tests for rav command wiring."""

from __future__ import annotations

from pathlib import Path

import yaml


def test_seed_command_defaults_to_safe_seed_script() -> None:
    rav_config_path = Path(__file__).resolve().parents[2] / "rav.yaml"
    rav_config = yaml.safe_load(rav_config_path.read_text(encoding="utf-8"))

    scripts = rav_config["scripts"]

    assert scripts["seed"] == "uv run python scripts/seed_existing_data.py"
    assert scripts["seed-safe"] == "uv run python scripts/seed_existing_data.py"
    assert scripts["seed-legacy"] == "uv run python scripts/seed_data.py"
