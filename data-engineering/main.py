"""Entry point for the QuickPoll data engineering pipeline."""

from __future__ import annotations

import logging

from data_engineering.config import get_engine
from data_engineering.loading.models import create_analytics_tables
from data_engineering.loading.triggers import deploy_triggers
from data_engineering.pipeline.backfill import run_backfill
from data_engineering.utils.logging import configure_logging

logger = logging.getLogger(__name__)


def main() -> None:
    """Bootstrap the pipeline: create tables → deploy triggers → backfill → exit."""
    configure_logging()

    engine = get_engine()
    create_analytics_tables(engine)
    logger.info("Analytics tables ensured.")

    deploy_triggers(engine)
    logger.info("Trigger functions deployed to PostgreSQL.")

    run_backfill()
    logger.info("Initial backfill complete. Pipeline setup finished.")


if __name__ == "__main__":
    main()
