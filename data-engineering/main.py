"""Entry point for the QuickPoll data engineering pipeline."""

from __future__ import annotations

import logging

from data_engineering.pipeline.backfill import run_backfill
from data_engineering.utils.logging import configure_logging

logger = logging.getLogger(__name__)


def main() -> None:
    """Bootstrap the pipeline by running the self-contained backfill flow."""
    configure_logging()

    run_backfill()
    logger.info("Pipeline setup finished.")


if __name__ == "__main__":
    main()
