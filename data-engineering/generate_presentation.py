import os
import sys

# Add the pptx creator script directory to sys path
SKILL_DIR = r"c:\Users\HenryNanaAntwi\Development\Phase 1 Capstone\quickpoll-team6\.agents\skills\amalitech-pptx-creator"
sys.path.insert(0, os.path.join(SKILL_DIR, "scripts"))

from pptx_bcg_patterns import BCGSlideBuilder

def generate_quickpoll_deck():
    bcg = BCGSlideBuilder(
        os.path.join(SKILL_DIR, "assets", "templates", "AmaliTech_Blank.pptx"),
        os.path.join(SKILL_DIR, "assets", "brand_config.json")
    )

    bcg.preload_icons(["lock", "calendar", "check", "chart", "globe", "server", "database", "cloud", "team", "rocket", "warning", "lightbulb", "target"])

    # 1. Title Slide
    bcg.add_title_slide("Group 6: QuickPoll", "Internal Polling & Voting Tool", "March 2026")

    # 2. Business Context (Problem & Why it matters)
    bcg.add_scr_slide(
        title="QuickPoll: A lightweight tool for team decisions",
        situation=[
            {"text": "Remote and distributed teams struggle to reach consensus quickly", "highlights": ["reach consensus quickly"]},
            {"text": "Existing communication tools lack structured, trackable polling features", "highlights": ["lack structured", "polling features"]}
        ],
        resolution=[
            {"type": "heading", "text": "Who it Serves & Why it Matters"},
            {"text": "Serves project managers, scrum masters, and team members", "highlights": ["project managers", "scrum masters"]},
            {"text": "Improves decision-making speed and transparency within organizations", "highlights": ["speed", "transparency"]}
        ],
        callout="Our MVP Goal: Implement a focused polling tool with analytics and expiration constraints.",
        source="Project Context & Requirements"
    )

    # 3. Team & Roles
    bcg.add_icon_bullets_slide(
        title="Team Configuration & Roles",
        items=[
            {"title": "Jude Boachie (Frontend)", "text": "Angular 19, Reactive Forms, and real-time Chart components", "icon": "globe"},
            {"title": "Abdul Basit (Backend)", "text": "Java 17, Spring Boot, JWT Auth, Poll CRUD & Routing", "icon": "server"},
            {"title": "Henry Antwi (Data Eng)", "text": "Python ETL, PostgreSQL Triggers & Real-time Analytics Setup", "icon": "database"},
            {"title": "Illiasu Abubakar (DevOps)", "text": "Docker Compose, CI/CD, and AWS ECS Fargate Deployment", "icon": "cloud"},
            {"title": "Samuel Boakye (QA)", "text": "Test Plans, REST Assured API tests, Selenium UI coverage", "icon": "check"}
        ]
    )


    # 4. Under the Hood: Architecture & Tech Stack
    bcg.add_icon_bullets_slide(
        title="Built on a modern, containerized technology stack",
        items=[
            {"title": "Frontend (Angular 19)", "text": "Standalone components, @if/@for syntax, and reactive state management", "icon": "globe"},
            {"title": "Backend (Spring Boot 3.2)", "text": "Java 17 providing robust REST APIs, JPA, and secure JWT Authentication", "icon": "server"},
            {"title": "Data Architecture (AWS RDS)", "text": "Pivoted to PostgreSQL trigger functions for near real-time KPI analytics", "icon": "database"},
            {"title": "Infrastructure (AWS Fargate)", "text": "Standalone ECS setup replacing always-on Kafka for cost/efficiency", "icon": "cloud"}
        ]
    )

    # 5. Live Demo Placeholder
    bcg.add_section_slide("Live Demo", "Walkthrough of core functionality with real data")

    # 6. Retrospective: Successes
    bcg.add_icon_bullets_slide(
        title="What went well during our sprint development",
        items=[
            {"title": "Team Cohesiveness", "text": "Clear division of roles with cross-functional support and regular standups", "icon": "team"},
            {"title": "Architecture Pivot", "text": "Successfully simplified Data Eng. by moving from Kafka to DB Triggers", "icon": "rocket"},
            {"title": "Deployment Automation", "text": "AWS ECS Fargate & GitHub Actions pipelines streamlined deployments", "icon": "cloud"}
        ]
    )

    # 7. Retrospective: Challenges & Learnings
    bcg.add_icon_bullets_slide(
        title="Navigating technical challenges and project constraints",
        items=[
            {"title": "Data Pipeline Complexity", "text": "Managing state and real-time syncing between OLTP and Analytics tables", "icon": "warning"},
            {"title": "Angular 19 Adoption", "text": "Migrating to new @if/@for syntax and strict standalone component patterns", "icon": "lightbulb"},
            {"title": "Environment Networking", "text": "Connecting standalone Fargate tasks securely to shared RDS instances", "icon": "target"}
        ]
    )

    # 8. Retrospective: What we'd do differently
    bcg.add_icon_bullets_slide(
        title="Opportunities for future iteration and improvement",
        items=[
            {"title": "Earlier Integration", "text": "Allocate more buffer time for API to UI integration testing", "icon": "calendar"},
            {"title": "Expanded Dashboard", "text": "Build deeper visual insights from the user_participation analytics table", "icon": "chart"},
            {"title": "Scheduled Reconciliation", "text": "Add EventBridge scheduled runs to verify trigger accuracy nightly", "icon": "database"}
        ]
    )

    # 9. Q&A
    bcg.add_end_slide("Thank You! Questions?")

    bcg.save("QuickPoll_V2_Presentation.pptx")
    print("Presentation successfully updated with V2 architecture.")

if __name__ == "__main__":
    generate_quickpoll_deck()
