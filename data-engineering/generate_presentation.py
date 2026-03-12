from __future__ import annotations

import sys
from importlib import import_module
from pathlib import Path
from typing import Any


def _skill_dir() -> Path:
    return (
        Path(__file__).resolve().parents[1]
        / ".agents"
        / "skills"
        / "amalitech-pptx-creator"
    )


def _load_bcg_builder() -> Any:
    scripts_dir = _skill_dir() / "scripts"
    scripts_dir_str = str(scripts_dir)
    if scripts_dir_str not in sys.path:
        sys.path.insert(0, scripts_dir_str)
    return import_module("pptx_bcg_patterns").BCGSlideBuilder


def _icon_item(title: str, text: str, icon: str) -> dict[str, str]:
    return {"title": title, "text": text, "icon": icon}


def _text_item(text: str, highlights: list[str]) -> dict[str, object]:
    return {"text": text, "highlights": highlights}


def _heading_item(text: str) -> dict[str, str]:
    return {"type": "heading", "text": text}


def generate_quickpoll_deck() -> None:
    skill_dir = _skill_dir()
    bcg_slide_builder = _load_bcg_builder()
    bcg = bcg_slide_builder(
        skill_dir / "assets" / "templates" / "AmaliTech_Blank.pptx",
        skill_dir / "assets" / "brand_config.json",
    )

    bcg.preload_icons(
        [
            "lock",
            "calendar",
            "check",
            "chart",
            "globe",
            "server",
            "database",
            "cloud",
            "team",
            "rocket",
            "warning",
            "lightbulb",
            "target",
        ]
    )

    bcg.add_title_slide(
        "Group 6: QuickPoll",
        "Internal Polling & Voting Tool",
        "March 2026",
    )

    bcg.add_scr_slide(
        title="QuickPoll: A lightweight tool for team decisions",
        situation=[
            _text_item(
                "Remote and distributed teams struggle to reach consensus quickly",
                ["reach consensus quickly"],
            ),
            _text_item(
                (
                    "Existing communication tools lack structured, "
                    "trackable polling features"
                ),
                ["lack structured", "polling features"],
            ),
        ],
        resolution=[
            _heading_item("Who it Serves & Why it Matters"),
            _text_item(
                "Serves project managers, scrum masters, and team members",
                ["project managers", "scrum masters"],
            ),
            _text_item(
                "Improves decision-making speed and transparency within organizations",
                ["speed", "transparency"],
            ),
        ],
        callout=(
            "Our MVP Goal: Implement a focused polling tool with analytics "
            "and expiration constraints."
        ),
        source="Project Context & Requirements",
    )

    bcg.add_icon_bullets_slide(
        title="Team Configuration & Roles",
        items=[
            _icon_item(
                "Jude Boachie (Frontend)",
                "Angular 19, Reactive Forms, and real-time Chart components",
                "globe",
            ),
            _icon_item(
                "Abdul Basit (Backend)",
                "Java 17, Spring Boot, JWT Auth, Poll CRUD & Routing",
                "server",
            ),
            _icon_item(
                "Henry Antwi (Data Eng)",
                "Python ETL, PostgreSQL Triggers & Real-time Analytics Setup",
                "database",
            ),
            _icon_item(
                "Illiasu Abubakar (DevOps)",
                "Docker Compose, CI/CD, and AWS ECS Fargate Deployment",
                "cloud",
            ),
            _icon_item(
                "Samuel Boakye (QA)",
                "Test Plans, REST Assured API tests, Selenium UI coverage",
                "check",
            ),
        ],
    )

    bcg.add_icon_bullets_slide(
        title="Built on a modern, containerized technology stack",
        items=[
            _icon_item(
                "Frontend (Angular 19)",
                "Standalone components, @if/@for syntax, and reactive state management",
                "globe",
            ),
            _icon_item(
                "Backend (Spring Boot 3.2)",
                (
                    "Java 17 providing robust REST APIs, JPA, and secure JWT "
                    "Authentication"
                ),
                "server",
            ),
            _icon_item(
                "Data Architecture (AWS RDS)",
                (
                    "Pivoted to PostgreSQL trigger functions for near "
                    "real-time KPI analytics"
                ),
                "database",
            ),
            _icon_item(
                "Infrastructure (AWS Fargate)",
                "Standalone ECS setup replacing always-on Kafka for cost/efficiency",
                "cloud",
            ),
        ],
    )

    bcg.add_section_slide(
        "Live Demo",
        "Walkthrough of core functionality with real data",
    )

    bcg.add_icon_bullets_slide(
        title="What went well during our sprint development",
        items=[
            _icon_item(
                "Team Cohesiveness",
                (
                    "Clear division of roles with cross-functional support "
                    "and regular standups"
                ),
                "team",
            ),
            _icon_item(
                "Architecture Pivot",
                "Successfully simplified Data Eng. by moving from Kafka to DB Triggers",
                "rocket",
            ),
            _icon_item(
                "Deployment Automation",
                "AWS ECS Fargate & GitHub Actions pipelines streamlined deployments",
                "cloud",
            ),
        ],
    )

    bcg.add_icon_bullets_slide(
        title="Navigating technical challenges and project constraints",
        items=[
            _icon_item(
                "Data Pipeline Complexity",
                (
                    "Managing state and real-time syncing between OLTP and "
                    "Analytics tables"
                ),
                "warning",
            ),
            _icon_item(
                "Angular 19 Adoption",
                (
                    "Migrating to new @if/@for syntax and strict standalone "
                    "component patterns"
                ),
                "lightbulb",
            ),
            _icon_item(
                "Environment Networking",
                "Connecting standalone Fargate tasks securely to shared RDS instances",
                "target",
            ),
        ],
    )

    bcg.add_icon_bullets_slide(
        title="Opportunities for future iteration and improvement",
        items=[
            _icon_item(
                "Earlier Integration",
                "Allocate more buffer time for API to UI integration testing",
                "calendar",
            ),
            _icon_item(
                "Expanded Dashboard",
                (
                    "Build deeper visual insights from the "
                    "user_participation analytics table"
                ),
                "chart",
            ),
            _icon_item(
                "Scheduled Reconciliation",
                "Add EventBridge scheduled runs to verify trigger accuracy nightly",
                "database",
            ),
        ],
    )

    bcg.add_end_slide("Thank You! Questions?")

    bcg.save("QuickPoll_V2_Presentation.pptx")
    print("Presentation successfully updated with V2 architecture.")


if __name__ == "__main__":
    generate_quickpoll_deck()
