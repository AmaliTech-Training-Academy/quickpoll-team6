# QuickPoll Architecture

## Overview
QuickPoll is a robust, modular survey and polling platform. The backend is built on **Java 21** using **Spring Boot 3**. It serves a React/Next.js frontend via a RESTful API and relies on **PostgreSQL** as the primary datastore.

## Core Design Principles

1. **Separation of Concerns:** The application cleanly separates the presentation layer (Controllers), business logic (Services), and data access (Repositories). Data transfer objects (DTOs) isolate the database models from the API contracts.
2. **Event-Driven Analytics:** To achieve high performance natively within PostgreSQL, QuickPoll utilizes an OLTP and OLAP separation. Polling transactions (votes) are written rapidly to OLTP tables (`votes`, `polls`), and asynchronous PostgreSQL database triggers maintain pre-computed aggregates in read-only OLAP tables (`analytics_poll_summary`, `analytics_option_breakdown`, `analytics_votes_timeseries`).
3. **Role-Based Security:** Endpoints are secured via **Spring Security** and JWTs. Authorization is determined contextually based on user roles (`USER` vs `ADMIN`), the `creator_id` of the entities, or explicit assignments in the `polls_invites` table.

## High-Level Architecture

### Presentation Layer (REST API)
The entry point for frontend requests. Controllers (`AuthController`, `PollController`, `DashboardController`, etc.) validate incoming HTTP requests, map them to internal structures, and route them to appropriate services.

### Service Layer
Houses core business rules:
- `AuthService`: Handles JWT generation, user registration, and authentication logic.
- `PollService`: Manages poll lifecycle, validations (e.g., max selections), and creator/invite entitlements.
- `VoteService`: Ensures a user only votes once and only if permitted, saving vote transactions.
- `DashboardService`: Maps OLAP analytics data into paginated DTOs for the administrative and creator dashboards.

### Data Access Layer (Spring Data JPA)
Provides database abstraction. Two distinct model families exist:
1. **OLTP Repositories:** Standard JPA repositories managing `User`, `Poll`, `PollOption`, `Vote`, and `Department`.
2. **OLAP Repositories:** Read-only repositories mapped to `@Immutable` entities (`AnalyticsPollSummary`, `AnalyticsOptionBreakdown`, etc.) that execute native or JPQL queries against the pre-aggregated analytics tables.

### Database (PostgreSQL)
The sole state engine.
- **Relational Integrity:** Foreign keys ensure strict relationships (e.g., Votes belong to Polls and Users).
- **Triggers:** Custom SQL triggers track changes on the `votes` and `polls` tables, updating the `analytics_*` tables instantly. This mitigates N+1 queries and expensive `COUNT()` operations during API reads.

## Authentication Flow
1. User submits credentials to `/api/auth/login`.
2. Spring Security authenticates the request against the `users` table.
3. A JWT is generated and returned to the client.
4. Subsequent requests include the JWT in the `Authorization: Bearer <token>` header.
5. The `JwtAuthFilter` intercepts the request, validates the token, and populates the `SecurityContext`.

## Future Scalability
- **Caching:** Redis can be introduced in front of the OLAP reads or Poll Options payload if traffic surges.
- **Microservices:** If necessary, the authentication or analytical components can be extracted into distinct services, utilizing the existing decoupled nature of the data models.
