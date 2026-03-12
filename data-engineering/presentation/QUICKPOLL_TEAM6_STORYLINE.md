# QuickPoll Team 6 - Business-First Storyline

## Presentation Type
- Business showcase (problem -> solution -> live demo -> retrospective)
- Total live delivery target: 15 minutes (13:30 content + 1:30 buffer)

## Slide Plan (12 Slides)
1. **QuickPoll helps distributed teams decide faster**  
   Team intro, project context, and one-line value proposition.
2. **Decision-making friction slows distributed execution**  
   Situation: fragmented channels, delayed alignment, weak engagement visibility.
3. **QuickPoll addresses the full decision loop end-to-end**  
   Resolution: create polls, vote once, see live outcomes, track engagement.
4. **Our MVP covers core product capabilities across the stack**  
   Auth, poll creation, voting constraints, expiry behavior, analytics-backed dashboard data.
5. **Live demo proves product flow from login to results**  
   Demo script: login -> create poll -> cast vote -> show results refresh -> show engagement indicators.
6. **Architecture enables reliable, real-time decision insights**  
   Angular frontend, Spring Boot backend, PostgreSQL, trigger-based analytics pipeline.
7. **Data engineering turns raw votes into decision intelligence**  
   Trigger deployment, analytics table creation, incremental backfill, metric definitions.
8. **Quality and DevOps practices reduce delivery risk**  
   API test framework, CI lint/test workflows, Dockerized setup, staging deployment workflow.
9. **Team collaboration model accelerated delivery under sprint pressure**  
   Role ownership, feature branches/PR flow, daily standups, shared integration checkpoints.
10. **Our solution aligns directly with all scoring dimensions**  
   Explicit mapping to sprint goal, UX, team cohesiveness, delivery, clarity/structure.
11. **Retrospective: wins, challenges, and next iteration focus**  
   What worked, what challenged us, and immediate post-sprint improvements.
12. **QuickPoll is demo-ready and scalable for broader internal use**  
   Closing + Q&A prompt.

## Evidence Anchors
- Product context and credentials: `README.md`
- Data pipeline behavior/runbook: `data-engineering/docs/USER_GUIDE.md`
- Deployment reliability posture: `data-engineering/docs/AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md`
- KPI definitions: `data-engineering/docs/METRIC_DEFINITIONS.md`
- QA/CI/CD quality signals: `qa/api-tests/README.md`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
