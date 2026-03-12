# DevOps Handoff: Deploy My Data Engineering Component on AWS

This is exactly how I need you to deploy my `data-engineering` part for the
current trigger-based architecture.

## What I Need You to Understand First

My component is **not** a long-running service anymore.

It is a short-lived bootstrap job that does this:

1. connects to the shared PostgreSQL database
2. creates the analytics tables
3. deploys the PostgreSQL trigger functions
4. runs backfill
5. exits

After that, PostgreSQL keeps the analytics updated by itself through triggers.

So please deploy my part as a **standalone ECS task on Amazon ECS on Fargate**,
not as an always-on service.

## What I Need You to Deploy

Please deploy my part using:

- **Amazon ECR** for the container image
- **Amazon ECS on Fargate** for running the task
- **Amazon RDS for PostgreSQL** as the shared database
- **CloudWatch Logs** for task logs
- **AWS Secrets Manager** or **SSM Parameter Store** for secrets

Optional:

- **EventBridge Scheduler** if we want to rerun the task on a schedule for
  reconciliation

## What I Do Not Need You to Deploy

Please do **not** deploy these for my part:

- Kafka
- ZooKeeper
- MSK
- an always-on ECS service with desired count greater than `0`

Those belong to the older architecture, not the current one.

## Responsibility Split

This part is important.

### What must already exist before my task runs

The OLTP tables must already exist in RDS:

- `users`
- `department`
- `department_members`
- `polls`
- `poll_options`
- `poll_invites`
- `votes`

Those are **not** created by my Fargate task.

On AWS, the backend or DB migrations must create them first.

### What my task creates

My task creates and maintains:

- `analytics_poll_summary`
- `analytics_option_breakdown`
- `analytics_votes_timeseries`
- `analytics_user_participation`
- `pipeline_watermarks`
- trigger functions from `schema_triggers.sql`
- triggers attached to the OLTP tables

So the order I need is:

1. create RDS
2. deploy backend or run DB migrations
3. confirm OLTP tables exist
4. run my `data-engineering` Fargate task

## How I Need My Part Deployed

### 1. Push my image to ECR

Create an ECR repo for my image, for example:

- `quickpoll/data-engineering`

From the `data-engineering/` directory:

```bash
docker build -t quickpoll-data-engineering .
docker tag quickpoll-data-engineering:latest <account-id>.dkr.ecr.<region>.amazonaws.com/quickpoll/data-engineering:latest
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/quickpoll/data-engineering:latest
```

Use a proper image tag for deployments:

- git SHA, or
- release tag

Do not rely only on `latest`.

### 2. Create an ECS task definition

Create my task definition with:

- launch type: `FARGATE`
- network mode: `awsvpc`
- OS: Linux
- starting size: `0.25 vCPU`
- memory: `0.5 GB` to `1 GB`

Container name:

- `data-engineering`

Do not override the command unless we explicitly need to.

The image already uses `entrypoint.sh`, which waits for DB readiness and then
runs `main.py`.

### 3. Set these environment variables

Please set these values in the task definition:

- `ENVIRONMENT=staging`
- `DB_HOST=<rds-endpoint>`
- `DB_PORT=5432`
- `DB_NAME=<database-name>`
- `DB_USER=<db-username>`
- `DB_PASSWORD` set to the database password
- `LOG_LEVEL=INFO`
- `DLQ_DIR=data/dlq`
- `BACKFILL_INTERVAL_MINUTES=30`
- `WATERMARK_OVERLAP_MINUTES=5`
- `FORCE_FULL_BACKFILL=false`

If we use Cloudflare R2 for DLQ in shared environments, also set:

- `R2_ENDPOINT_URL`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_DLQ_BUCKET`

Please put secrets in:

- AWS Secrets Manager, or
- SSM Parameter Store

Do not hardcode DB passwords in the task definition JSON.

## How to Give My Task Access to RDS

This is the most important infrastructure part.

### 1. Put the ECS task in the right VPC

Run my Fargate task in:

- the same VPC as RDS, or
- a VPC that has proper routing to RDS

Recommended:

- private subnets for ECS
- private subnets for RDS

### 2. Create a security group for my ECS task

Example:

- `sg-quickpoll-data-engineering`

Allow outbound traffic as needed.

At minimum, the task must be able to reach:

- RDS on TCP `5432`
- ECR
- CloudWatch Logs
- Secrets Manager or SSM
- optional R2 endpoint

### 3. Update the RDS security group

On the RDS security group, add this inbound rule:

- type: PostgreSQL
- port: `5432`
- source: **the ECS task security group**

This is the right setup.

Use **security-group-to-security-group access**.

Do **not** open PostgreSQL to:

- `0.0.0.0/0`
- the public internet

### 4. Confirm connectivity requirements

My task will connect to RDS only if all of these are true:

1. the ECS task subnets can route to the RDS subnets
2. the ECS task security group allows outbound traffic
3. the RDS security group allows inbound `5432` from the ECS task security group
4. the DB hostname, username, password, and database name are correct

## IAM Roles I Need

Please use the normal ECS setup.

### Task execution role

This role needs access to:

- pull the image from ECR
- write logs to CloudWatch
- read secrets from Secrets Manager or SSM if they are injected by ECS

Starting point:

- `AmazonECSTaskExecutionRolePolicy`

Add secret-read permissions for:

- DB password
- optional R2 credentials

### Task role

If the container itself is calling AWS APIs at runtime, use a task role.

For the current codebase, this can stay minimal unless we later add direct AWS
API calls from inside the app.

## How I Need You to Run It

### Default mode

Run my part as a **standalone task** when:

- a new environment is created
- trigger SQL changes
- analytics schema changes
- I ask for a full rebuild

Use:

- `aws ecs run-task`

This is the main deployment model I want.

### Optional scheduled mode

If we want periodic reconciliation, create an EventBridge schedule that runs
the same Fargate task:

- nightly
- every 6 hours
- once every morning before demos

That scheduled run is only a safety net. The live updates still come from the
database triggers.

## Exact Deployment Order I Need

Please follow this order:

1. provision Amazon RDS for PostgreSQL
2. deploy backend or run DB migrations
3. verify the OLTP tables exist in RDS
4. push my image to ECR
5. create the ECS Fargate task definition
6. run my task once
7. inspect CloudWatch logs
8. verify analytics tables and triggers in RDS
9. hand the environment to backend/frontend

## What Success Looks Like

When my task runs successfully, the logs should include:

- `Analytics tables ensured.`
- `Trigger functions deployed to PostgreSQL.`
- `Initial backfill complete. Pipeline setup finished.`

## What I Need You to Verify in RDS

After the task finishes, please verify these SQL checks.

### Analytics tables

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'analytics_%'
ORDER BY tablename;
```

Expected:

- `analytics_option_breakdown`
- `analytics_poll_summary`
- `analytics_user_participation`
- `analytics_votes_timeseries`

### Trigger functions

```sql
SELECT proname
FROM pg_proc
WHERE proname IN (
  'fn_refresh_poll_summary',
  'fn_refresh_all_poll_summaries',
  'fn_refresh_option_breakdown',
  'fn_refresh_votes_timeseries',
  'fn_refresh_user_participation',
  'fn_delete_poll_analytics'
)
ORDER BY proname;
```

### Table triggers

```sql
SELECT tgname
FROM pg_trigger
WHERE tgname IN (
  'trg_vote_after_insert',
  'trg_poll_after_insert',
  'trg_poll_after_update',
  'trg_poll_after_delete',
  'trg_user_after_insert',
  'trg_user_after_update',
  'trg_option_after_insert',
  'trg_option_after_update',
  'trg_option_after_delete'
)
ORDER BY tgname;
```

### Backfill counts

```sql
SELECT
  (SELECT COUNT(*) FROM analytics_poll_summary) AS poll_summary_rows,
  (SELECT COUNT(*) FROM analytics_option_breakdown) AS option_rows,
  (SELECT COUNT(*) FROM analytics_votes_timeseries) AS timeseries_rows,
  (SELECT COUNT(*) FROM analytics_user_participation) AS user_rows;
```

### Live trigger behavior

Please test one real backend flow:

1. create a poll
2. add options
3. cast a vote

Then verify that the analytics rows changed.

## When I Need You to Rerun My Task

Please rerun it when:

- `schema_triggers.sql` changes
- analytics table shape changes
- I request a full refresh
- a new environment is created

If I ask for a full rebuild, run the task with:

- `FORCE_FULL_BACKFILL=true`

for that run only.

## Common Problems

### Problem: the task cannot connect to RDS

Check:

- subnet routing
- security groups
- DB host
- credentials

### Problem: task succeeds but triggers are missing

Check:

- task pointed to the correct database
- `schema_triggers.sql` was executed
- CloudWatch logs for trigger deployment errors

### Problem: task fails because tables like `polls` or `votes` do not exist

That means the backend schema was not created yet.

Remember:

- my task does **not** create OLTP tables on RDS
- backend or DB migrations must do that first

### Problem: DevOps deployed it as an always-on service

That is the wrong deployment model for the current architecture.

Please run it as a standalone task instead.

## What I Need You to Hand Over After Deployment

Once my task is working, please give the backend team:

- RDS endpoint
- database name
- confirmation that analytics tables exist
- confirmation that trigger functions and table triggers are live

The backend should then build dashboard endpoints on top of:

- `analytics_poll_summary`
- `analytics_option_breakdown`
- `analytics_votes_timeseries`
- `analytics_user_participation`

## Short Version

If you only remember one page, remember this:

1. create RDS
2. let backend create the OLTP tables
3. push my `data-engineering` image to ECR
4. run it as a standalone ECS Fargate task
5. give that task access to RDS on port `5432`
6. verify analytics tables, trigger functions, and table triggers
7. rerun the task when I change triggers or analytics schema
