# Data Engineering — Documentation Index

| Document | Description |
|---|---|
| [USER_GUIDE.md](USER_GUIDE.md) | How to set up, run, configure, and troubleshoot the pipeline |
| [BACKEND_DASHBOARD_IMPLEMENTATION_HANDOFF.md](BACKEND_DASHBOARD_IMPLEMENTATION_HANDOFF.md) | Current backend handoff for building dashboard and poll analytics endpoints from the trigger-backed OLAP tables |
| [FRONTEND_DASHBOARD_ANGULAR_HANDOFF.md](FRONTEND_DASHBOARD_ANGULAR_HANDOFF.md) | Angular frontend handoff for consuming dashboard analytics endpoints and implementing the dashboard and poll metrics views |
| [AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md](AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md) | Current-state AWS handoff for deploying the trigger-based data-engineering task on ECR/ECS Fargate with RDS access |
| [REMOTE_DB_HANDOFF.md](REMOTE_DB_HANDOFF.md) | Shared remote PostgreSQL handoff for backend/frontend integration after local trigger validation |
| [PIPELINE_ARCHITECTURE.md](PIPELINE_ARCHITECTURE.md) | End-to-end pipeline design and implementation history |
| [INCREMENTAL_BACKFILL_SPEC.md](INCREMENTAL_BACKFILL_SPEC.md) | Complete watermark-driven incremental backfill specification |
| [TEAM_INTEGRATION_GUIDE.md](TEAM_INTEGRATION_GUIDE.md) | Role-specific integration notes for DevOps, Backend, Frontend, and QA |
| [KAFKA_TO_TRIGGERS_MIGRATION.md](KAFKA_TO_TRIGGERS_MIGRATION.md) | Migration plan from Kafka streaming to PostgreSQL triggers |
| [DEVOPS_INFRA_GUIDE.md](DEVOPS_INFRA_GUIDE.md) | Infrastructure guide from the earlier Kafka-based phase |
| [erd.md](erd.md) | Entity-relationship diagram for the `quickpoll` database |
