"""Structural tests for local trigger stack assets and handoff docs."""

from __future__ import annotations

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOCAL_COMPOSE_FILE = PROJECT_ROOT / "docker-compose.local.yml"
README_FILE = PROJECT_ROOT / "README.md"
DOCS_INDEX_FILE = PROJECT_ROOT / "docs" / "README.md"
REMOTE_HANDOFF_FILE = PROJECT_ROOT / "docs" / "REMOTE_DB_HANDOFF.md"
AWS_DEPLOYMENT_GUIDE_FILE = (
    PROJECT_ROOT / "docs" / "AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md"
)
BACKEND_DASHBOARD_HANDOFF_FILE = (
    PROJECT_ROOT / "docs" / "BACKEND_DASHBOARD_IMPLEMENTATION_HANDOFF.md"
)
FRONTEND_DASHBOARD_HANDOFF_FILE = (
    PROJECT_ROOT / "docs" / "FRONTEND_DASHBOARD_ANGULAR_HANDOFF.md"
)


class TestLocalComposeFile:
    def _content(self) -> str:
        return LOCAL_COMPOSE_FILE.read_text(encoding="utf-8")

    def test_local_compose_file_exists(self) -> None:
        assert LOCAL_COMPOSE_FILE.exists()

    def test_local_compose_contains_required_services(self) -> None:
        content = self._content()
        for snippet in ("postgres:", "data-pipeline:", "condition: service_healthy"):
            assert snippet in content

    def test_local_compose_forces_self_contained_database_settings(self) -> None:
        content = self._content()
        for snippet in (
            "ENVIRONMENT: local-dev",
            "DB_HOST: postgres",
            "DB_NAME: quickpoll",
            "DB_USER: quickpoll",
            "DB_PASSWORD: quickpoll123",
        ):
            assert snippet in content

    def test_local_compose_persists_schema_and_pipeline_data(self) -> None:
        content = self._content()
        for snippet in (
            "./schema.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro",
            "./data:/app/data",
        ):
            assert snippet in content


class TestRemoteHandoffDocs:
    def _handoff_content(self) -> str:
        return REMOTE_HANDOFF_FILE.read_text(encoding="utf-8")

    def test_remote_handoff_doc_exists(self) -> None:
        assert REMOTE_HANDOFF_FILE.exists()

    def test_remote_handoff_doc_contains_remote_deploy_steps(self) -> None:
        content = self._handoff_content()
        for snippet in (
            "uv run python main.py",
            "docker build -t quickpoll-data-engineering .",
            "docker run --rm",
            "analytics_poll_summary",
            "trg_vote_after_insert",
        ):
            assert snippet in content

    def test_readme_points_to_local_compose_and_not_old_kafka_compose(self) -> None:
        content = README_FILE.read_text(encoding="utf-8")
        assert "docker-compose.local.yml" in content
        assert "docker-compose.kafka-dev.yml" not in content

    def test_docs_index_lists_remote_handoff(self) -> None:
        content = DOCS_INDEX_FILE.read_text(encoding="utf-8")
        assert "REMOTE_DB_HANDOFF.md" in content


class TestAwsDeploymentDocs:
    def test_aws_deployment_guide_exists(self) -> None:
        assert AWS_DEPLOYMENT_GUIDE_FILE.exists()

    def test_aws_deployment_guide_covers_fargate_and_rds_access(self) -> None:
        content = AWS_DEPLOYMENT_GUIDE_FILE.read_text(encoding="utf-8")
        for snippet in (
            "Amazon ECS on Fargate",
            "Amazon RDS for PostgreSQL",
            "security-group-to-security-group access",
            "run it as a standalone task",
        ):
            assert snippet in content

    def test_docs_index_lists_aws_deployment_guide(self) -> None:
        content = DOCS_INDEX_FILE.read_text(encoding="utf-8")
        assert "AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md" in content


class TestDashboardHandoffDocs:
    def test_backend_dashboard_handoff_exists(self) -> None:
        assert BACKEND_DASHBOARD_HANDOFF_FILE.exists()

    def test_backend_dashboard_handoff_covers_olap_first_reads(self) -> None:
        content = BACKEND_DASHBOARD_HANDOFF_FILE.read_text(encoding="utf-8")
        for snippet in (
            "analytics_poll_summary",
            "analytics_option_breakdown",
            "analytics_votes_timeseries",
            "analytics_user_participation",
            "/dashboard/summary",
            "/polls/{pollId}/results/timeseries",
            "do not aggregate raw `votes`",
        ):
            assert snippet in content

    def test_frontend_dashboard_handoff_exists(self) -> None:
        assert FRONTEND_DASHBOARD_HANDOFF_FILE.exists()

    def test_frontend_dashboard_handoff_covers_angular_integration(self) -> None:
        content = FRONTEND_DASHBOARD_HANDOFF_FILE.read_text(encoding="utf-8")
        for snippet in (
            "Angular",
            "DashboardService",
            "PollMetricsComponent",
            "frontend/src/app/models.ts",
            "/dashboard/top-users",
            "/polls/{pollId}/results",
        ):
            assert snippet in content

    def test_docs_index_lists_dashboard_handoffs(self) -> None:
        content = DOCS_INDEX_FILE.read_text(encoding="utf-8")
        assert "BACKEND_DASHBOARD_IMPLEMENTATION_HANDOFF.md" in content
        assert "FRONTEND_DASHBOARD_ANGULAR_HANDOFF.md" in content
