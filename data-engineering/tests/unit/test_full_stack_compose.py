from __future__ import annotations

from pathlib import Path

import yaml


def test_local_compose_uses_postgres_full_stack_without_kafka() -> None:
    compose_path = Path(__file__).resolve().parents[2] / "docker-compose.local.yml"
    compose_config = yaml.safe_load(compose_path.read_text(encoding="utf-8"))

    services = compose_config["services"]

    assert set(services) == {"postgres", "backend", "data-pipeline", "frontend"}
    assert "kafka" not in services
    assert "zookeeper" not in services
    assert services["backend"]["environment"]["DB_URL"].startswith(
        "jdbc:postgresql://postgres:5432/"
    )
    assert services["data-pipeline"]["environment"]["DB_HOST"] == "postgres"
    assert services["frontend"]["build"]["dockerfile"] == (
        "data-engineering/docker/frontend.local.Dockerfile"
    )
    assert services["frontend"]["build"]["args"]["API_BASE_URL"] == (
        "${FRONTEND_API_BASE_URL:-https://nonmoral-zachariah-unindignant.ngrok-free.dev/api}"
    )


def test_frontend_local_dockerfile_overrides_api_base_url() -> None:
    dockerfile_path = (
        Path(__file__).resolve().parents[2] / "docker" / "frontend.local.Dockerfile"
    )
    dockerfile_content = dockerfile_path.read_text(encoding="utf-8")

    assert "ARG API_BASE_URL=http://localhost:8080/api" in dockerfile_content
    assert "src/app/constants.ts" in dockerfile_content
    assert "patch_frontend_templates.mjs" in dockerfile_content
    assert "npm config set fetch-retries" in dockerfile_content
    assert "npm ci --no-audit --prefer-offline" in dockerfile_content


def test_frontend_template_patch_script_targets_dashboard_pages() -> None:
    patch_script_path = (
        Path(__file__).resolve().parents[2] / "docker" / "patch_frontend_templates.mjs"
    )
    patch_script = patch_script_path.read_text(encoding="utf-8")

    assert "dashboard.component.ts" in patch_script
    assert "poll-metrics.component.ts" in patch_script
    assert "const selfClosingTagPattern" in patch_script
    assert '"<$1$2></$1>"' in patch_script
