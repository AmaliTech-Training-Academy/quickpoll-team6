# data-engineering

QuickPoll real-time analytics pipeline using [uv](https://docs.astral.sh/uv/), [rav](https://github.com/jmitchel3/rav), [ruff](https://docs.astral.sh/ruff/), Docker, and GitHub Actions CI.

## Prerequisites

- **Python 3.11+**
- **uv** — [astral.sh/uv](https://docs.astral.sh/uv/getting-started/installation/)

## Setup

```powershell
uv sync
```

## Directory Structure

See [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) for the full layout.

## Usage

| Command | Description |
|---------|-------------|
| `rav x run` | Run main pipeline |
| `rav x test` | Run pytest |
| `rav x test-cov` | Run pytest with coverage |
| `rav x lint` | Ruff lint |
| `rav x format-fix` | Ruff format |
| `rav list` | List all commands |

## Docker

```powershell
docker build -t data-engineering .
docker run --rm data-engineering
```

### Local Trigger Dev Stack

```powershell
docker compose -f docker-compose.local.yml up --build
```

This local stack starts:

- PostgreSQL on `localhost:5432`
- the trigger-based `data-pipeline` init container

The pipeline container waits for Postgres, deploys the analytics triggers, runs
backfill, and exits cleanly. PostgreSQL continues serving future analytics
updates through the installed triggers.

To start only the database for local seeding/debugging:

```powershell
docker compose -f docker-compose.local.yml up -d postgres
```

The PostgreSQL schema is initialized from `schema.sql` on first startup, and
the local stack is self-contained even if your `.env` is currently pointed at a
shared staging database.

Use `rav x seed` to load baseline sample data. It is self-contained and does
not require backend `data.sql` to run first.

## Documentation

- [docs/AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md](docs/AWS_FARGATE_RDS_DEPLOYMENT_GUIDE.md)
- [PIPELINE_ARCHITECTURE.md](PIPELINE_ARCHITECTURE.md)
- [docs/REMOTE_DB_HANDOFF.md](docs/REMOTE_DB_HANDOFF.md)
- [docs/](docs/)
