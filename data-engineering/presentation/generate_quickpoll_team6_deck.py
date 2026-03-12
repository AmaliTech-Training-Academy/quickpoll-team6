# ruff: noqa: E501, I001
from __future__ import annotations

import json
import sys
from pathlib import Path


def _resolve_paths() -> tuple[Path, Path]:
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent.parent
    skill_dir = repo_root / ".agents" / "skills" / "amalitech-pptx-creator"
    return repo_root, skill_dir


def main() -> None:
    repo_root, skill_dir = _resolve_paths()
    scripts_dir = skill_dir / "scripts"
    if not scripts_dir.exists():
        raise FileNotFoundError(f"Skill scripts directory not found: {scripts_dir}")

    sys.path.insert(0, str(scripts_dir))
    from pptx_bcg_patterns import BCGSlideBuilder  # pylint: disable=import-outside-toplevel

    template = skill_dir / "assets" / "templates" / "AmaliTech_Blank.pptx"
    brand_config = skill_dir / "assets" / "brand_config.json"
    output_dir = repo_root / "data-engineering" / "presentation" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_pptx = output_dir / "QuickPoll_Team6_Presentation.pptx"
    output_score = output_dir / "QuickPoll_Team6_Presentation_score.json"

    bcg = BCGSlideBuilder(str(template), str(brand_config))
    bcg.preload_icons(
        [
            "team",
            "target",
            "chart",
            "check",
            "calendar",
            "gear",
            "database",
            "server",
            "globe",
            "security",
            "lock",
            "rocket",
            "document",
            "clock",
            "person",
        ]
    )
    bcg.set_sections(["Context", "Solution", "Proof", "Retrospective"])

    bcg.add_title_slide(
        "QuickPoll Team 6 - Demo Day Showcase",
        "A lightweight decision platform for distributed teams",
        "AmaliTech Phase 1 Capstone | March 2026",
        notes=(
            "Open with business value first, then mention team roles. "
            "Set expectation: problem, solution demo, and retrospective."
        ),
    )

    bcg.add_scr_slide(
        title="QuickPoll removes team decision friction in daily work",
        situation=[
            {
                "text": (
                    "Distributed teams lose momentum when decisions are scattered "
                    "across chats, calls, and follow-ups."
                ),
                "highlights": ["lose momentum"],
            },
            {
                "text": (
                    "Without structured voting, teams struggle to capture one final "
                    "answer and clear ownership."
                ),
                "highlights": ["one final answer"],
            },
            {
                "text": (
                    "Leads also lack immediate visibility into participation trends, "
                    "making engagement hard to improve."
                ),
                "highlights": ["participation trends"],
            },
        ],
        resolution=[
            {"type": "heading", "text": "What We Built"},
            {
                "text": (
                    "QuickPoll provides authenticated poll creation, one-vote "
                    "enforcement, and clear outcome visibility."
                ),
                "highlights": ["one-vote enforcement"],
            },
            {
                "text": (
                    "The product combines backend APIs, Angular UI, and analytics "
                    "datasets to support real-time team decisions."
                ),
                "highlights": ["real-time team decisions"],
            },
            {"type": "heading", "text": "Business Outcome"},
            {
                "text": (
                    "Teams move from opinion-heavy discussions to measurable, "
                    "auditable decisions with faster alignment."
                ),
                "highlights": ["faster alignment"],
            },
        ],
        callout="Decision confidence improves when every vote is captured once and tracked consistently.",
        source="Project brief and team implementation scope, March 2026",
        section="Context",
        notes=(
            "Frame this as the why-now slide. Keep it non-technical and tie pain "
            "to team productivity."
        ),
    )

    bcg.add_process_flow_slide(
        title="QuickPoll covers the decision loop end-to-end",
        steps=[
            {
                "title": "Create",
                "icon": "document",
                "items": [
                    "Owner defines question, options, and deadline.",
                    "Single-select or multi-select behavior is configured.",
                ],
            },
            {
                "title": "Invite",
                "icon": "team",
                "items": [
                    "Poll audience is targeted by team context.",
                    "Access is controlled through authenticated accounts.",
                ],
            },
            {
                "title": "Vote",
                "icon": "check",
                "items": [
                    "Users submit final choices with one-vote constraints.",
                    "Expired polls automatically close for data integrity.",
                ],
            },
            {
                "title": "Analyze",
                "icon": "chart",
                "items": [
                    "Results and participation metrics are prepared for dashboards.",
                    "Teams can review trend signals for engagement actions.",
                ],
            },
        ],
        source="README, backend poll APIs, data-engineering metric definitions",
        takeaway="QuickPoll links user actions to measurable decision outcomes in one workflow.",
        section="Solution",
        notes="Walk left to right as product journey. Keep momentum and transition into MVP proof.",
    )

    bcg.add_mece_slide(
        title="Our MVP delivers core capabilities for team polling",
        boxes=[
            {
                "icon": "security",
                "title": "Identity & Access",
                "bullets": [
                    "JWT auth with role-aware access",
                    "Registered users only",
                ],
            },
            {
                "icon": "document",
                "title": "Poll Management",
                "bullets": [
                    "Poll create/list/read flows",
                    "Options and deadlines included",
                ],
            },
            {
                "icon": "check",
                "title": "Voting Integrity",
                "bullets": [
                    "Final vote submission pattern",
                    "Automatic poll expiration controls",
                ],
            },
            {
                "icon": "chart",
                "title": "Analytics Outputs",
                "bullets": [
                    "Participation and option metrics",
                    "Prepared datasets for dashboarding",
                ],
            },
        ],
        source="README, PollController/AuthController, USER_GUIDE",
        takeaway="The delivered baseline is business-usable and ready for iterative enhancement.",
        section="Solution",
        notes=(
            "Use this slide to map requirements to delivery. Keep language simple "
            "for evaluators from mixed backgrounds."
        ),
    )

    bcg.add_process_flow_slide(
        title="Live demo proves value in under 6 minutes",
        steps=[
            {
                "title": "Login",
                "icon": "person",
                "items": [
                    "Sign in with seeded demo users.",
                    "Navigate directly to protected poll workspace.",
                ],
            },
            {
                "title": "Create Poll",
                "icon": "document",
                "items": [
                    "Create a realistic team decision poll.",
                    "Set options, audience, and expiration window.",
                ],
            },
            {
                "title": "Cast Vote",
                "icon": "check",
                "items": [
                    "Submit user vote and confirm finality behavior.",
                    "Use second account for participation proof.",
                ],
            },
            {
                "title": "Show Results",
                "icon": "chart",
                "items": [
                    "Display updated outcomes and participation context.",
                    "Tie outputs to dashboard-ready analytics tables.",
                ],
            },
        ],
        source="Frontend routes/components and backend poll endpoints",
        takeaway="The demo storyline follows evaluator expectations: context, capability, and impact.",
        section="Proof",
        notes=(
            "Assign ownership: Frontend drives UI, Backend explains API behavior, "
            "Data Engineering anchors metrics meaning."
        ),
    )

    bcg.add_architecture_slide(
        title="Layered architecture secures flow and analytics",
        layers=[
            {
                "label": "User Interface",
                "color": "light",
                "components": [
                    {
                        "name": "Angular App",
                        "icon": "globe",
                        "detail": "Standalone components",
                    },
                    {
                        "name": "Auth Guard",
                        "icon": "security",
                        "detail": "Route protection",
                    },
                ],
            },
            {
                "label": "Application API",
                "color": "primary",
                "components": [
                    {
                        "name": "Spring Boot",
                        "icon": "server",
                        "detail": "REST endpoints",
                    },
                    {"name": "JWT Security", "icon": "lock", "detail": "AuthN/AuthZ"},
                ],
            },
            {
                "label": "Transactional Data",
                "color": "light",
                "components": [
                    {
                        "name": "PostgreSQL OLTP",
                        "icon": "database",
                        "detail": "Polls and votes",
                    },
                    {
                        "name": "Poll Scheduler",
                        "icon": "clock",
                        "detail": "Expiry automation",
                    },
                ],
            },
            {
                "label": "Analytics Layer",
                "color": "accent",
                "components": [
                    {
                        "name": "Trigger Functions",
                        "icon": "gear",
                        "detail": "Live refresh logic",
                    },
                    {
                        "name": "Analytics Tables",
                        "icon": "chart",
                        "detail": "Dashboard datasets",
                    },
                ],
            },
        ],
        connectors=["HTTP + JWT", "JPA/SQL", "Triggers + Backfill"],
        source="README, USER_GUIDE, AWS_FARGATE_RDS_DEPLOYMENT_GUIDE",
        section="Proof",
        notes=(
            "Keep this at system level. Avoid deep internals. Emphasize reliability "
            "and why trigger-based analytics reduces moving parts."
        ),
    )

    bcg.add_stats_slide(
        title="Data pipeline converts activity into usable insights",
        stats=[
            {"value": "4", "label": "Analytics Tables Maintained"},
            {"value": "5", "label": "Trigger Functions Deployed"},
            {"value": "10", "label": "Sample Polls Backfilled"},
            {"value": "47", "label": "Sample Votes Processed"},
        ],
        details=[
            {"type": "heading", "text": "Operational impact"},
            {
                "text": (
                    "The pipeline is run-to-completion: create analytics schema, deploy triggers, "
                    "backfill historical data, and exit cleanly."
                )
            },
            {
                "text": (
                    "After setup, PostgreSQL triggers keep metrics current without an always-on analytics service."
                )
            },
        ],
        source="USER_GUIDE startup logs and trigger architecture docs",
        takeaway="This design keeps analytics consistent while minimizing runtime operational overhead.",
        section="Proof",
        notes="Data engineer owns this slide. Mention local and staging deployment readiness in one sentence.",
    )

    bcg.add_icon_bullets_slide(
        title="Quality and DevOps controls support dependable releases",
        items=[
            {
                "icon": "check",
                "title": "API Quality Validation",
                "description": "Rest Assured + JUnit 5 framework covers functional, contract, security, and performance checks.",
            },
            {
                "icon": "gear",
                "title": "Continuous Integration",
                "description": "Automated lint and build checks run across backend, frontend, and data-engineering modules.",
            },
            {
                "icon": "rocket",
                "title": "Deployment Workflow",
                "description": "Staging pipeline provisions infrastructure, builds images, and updates ECS services.",
            },
            {
                "icon": "database",
                "title": "Environment Repeatability",
                "description": "Docker Compose and documented runbooks reduce setup drift during testing and demos.",
            },
            {
                "icon": "document",
                "title": "Operational Documentation",
                "description": "User and deployment guides provide clear handoff steps for cross-functional collaboration.",
            },
        ],
        source="qa/api-tests/README.md, ci.yml, deploy.yml, USER_GUIDE",
        section="Proof",
        notes=(
            "QA and DevOps should co-present this slide as one reliability story, "
            "not separate technical checklists."
        ),
    )

    bcg.add_timeline_slide(
        title="Structured collaboration accelerated team delivery",
        phases=[
            {
                "title": "Day 1 Foundation",
                "duration": "Setup",
                "icon": "target",
                "items": [
                    "Aligned on architecture and role split.",
                    "Bootstrapped environments and baseline APIs.",
                ],
            },
            {
                "title": "Day 2 Core Build",
                "duration": "Feature Delivery",
                "icon": "gear",
                "items": [
                    "Implemented core product and pipeline modules.",
                    "Integrated frontend flows with backend endpoints.",
                ],
            },
            {
                "title": "Day 3 Integration",
                "duration": "Validation",
                "icon": "check",
                "items": [
                    "Ran QA scenarios and cross-team fixes.",
                    "Stabilized end-to-end demo narrative.",
                ],
            },
            {
                "title": "Day 4 Polish",
                "duration": "Presentation Ready",
                "icon": "chart",
                "items": [
                    "Finalized docs, reliability checks, and rehearsal.",
                    "Prepared backup paths for smooth live demo.",
                ],
            },
        ],
        source="Sprint milestone plan and team workflow",
        takeaway="Clear role ownership plus daily integration checkpoints improved team cohesiveness.",
        section="Retrospective",
        notes="Use this to satisfy the team-collaboration scoring dimension explicitly.",
    )

    bcg.add_icon_bullets_slide(
        title="Our solution maps directly to the evaluator scorecard",
        items=[
            {
                "icon": "target",
                "title": "Sprint Goal Achievement",
                "description": "We deliver an integrated polling solution with auth, polling flows, and analytics outputs.",
            },
            {
                "icon": "globe",
                "title": "User Experience",
                "description": "The walkthrough demonstrates clear navigation from login to poll actions and result visibility.",
            },
            {
                "icon": "team",
                "title": "Team Cohesiveness",
                "description": "Role-based ownership and coordinated handoffs enabled faster implementation and integration.",
            },
            {
                "icon": "rocket",
                "title": "Presentation Delivery",
                "description": "The demo is rehearsed, data is preloaded, and sequence timing is aligned to a 15-minute window.",
            },
            {
                "icon": "document",
                "title": "Clarity and Structure",
                "description": "Narrative follows problem -> solution -> live proof -> retrospective with explicit business impact.",
            },
        ],
        source="Evaluator guidance email and team demo preparation",
        section="Proof",
        notes=(
            "Explicitly mention each dimension label out loud to make scoring alignment easy for evaluators."
        ),
    )

    bcg.add_combo_slide(
        title="Retrospective confirms momentum and clear next steps",
        left_content=[
            {"type": "heading", "text": "What went well"},
            {
                "text": (
                    "Cross-functional ownership across frontend, backend, QA, data engineering, "
                    "and DevOps kept delivery parallel and coordinated."
                )
            },
            {
                "text": (
                    "Documentation and automation reduced setup surprises and improved confidence before demo day."
                )
            },
            {"type": "heading", "text": "What challenged us"},
            {
                "text": (
                    "Synchronizing feature integration and environment consistency under a short sprint window required tight communication."
                )
            },
            {"type": "heading", "text": "What we do next"},
            {
                "text": (
                    "Expand UX polish, deepen analytics visual layers, and raise automated test depth for release hardening."
                )
            },
        ],
        right_stats=[
            {"value": "5", "label": "Delivery Roles Coordinated", "icon": "team"},
            {"value": "3", "label": "Core Quality Pipelines Active", "icon": "check"},
            {"value": "1", "label": "Unified Storyline for Demo", "icon": "target"},
        ],
        source="Team sprint retrospective and repository artifacts",
        takeaway="We leave this sprint with a working foundation and a concrete roadmap to production maturity.",
        section="Retrospective",
        notes="Keep this honest and crisp. Mention one challenge and one concrete improvement commitment.",
    )

    bcg.add_end_slide(
        "Thank You - QuickPoll Team 6",
        notes=(
            "Transition to Q&A. Keep one teammate ready to navigate demo fallback screenshots if needed."
        ),
    )

    score = bcg.score_quality()
    bcg.save(str(output_pptx))
    output_score.write_text(json.dumps(score, indent=2), encoding="utf-8")

    print(f"Presentation saved: {output_pptx}")
    print(f"Quality score: {score.get('total')} | passed={score.get('passed')}")
    print(f"Score details saved: {output_score}")


if __name__ == "__main__":
    main()
