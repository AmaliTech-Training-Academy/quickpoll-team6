# QuickPoll - Real-Time Polling Platform

Full-stack polling: Spring Boot 3.2 + Angular 19 + PostgreSQL 16 + Kafka analytics pipeline.

## Quick Start: docker-compose up --build

Services: postgres, zookeeper, kafka, backend, data-pipeline, frontend.

## Users: admin@quickpoll.com / user@quickpoll.com (password123)

## Data Engineering

The `data-engineering` folder contains the analytics pipeline (Kafka consumer, Pandas ETL, PostgreSQL analytics tables). See [data-engineering/README.md](data-engineering/README.md) for setup and usage.
