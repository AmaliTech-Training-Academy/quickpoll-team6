# QuickPoll Technical Decisions & Architectural Rationale

This document details the reasoning behind the most significant technical and architectural choices in the QuickPoll backend.

## 1. OLAP vs. OLTP Separation Strategy
**The Problem:** Polling applications inherently face heavy read/write imbalances. Users casting votes execute millions of fast `INSERT` statements (OLTP workload), while dashboard users concurrently request rich aggregations—like top participants or percentage breakdowns per option (OLAP workload). Querying a single `votes` table using `COUNT()` operations to generate a dashboard is CPU-intensive and unscalable for large datasets.

**The Solution:** QuickPoll maintains a strict separation:
- Core business tables (`polls`, `options`, `votes`) function purely as append-heavy transaction logs.
- Four `analytics_*` tables serve as read-maximized materializations of the data. The backend explicitly prevents writing to these tables from Java (entities are decorated with `@Immutable`).

**Why Not Materialized Views?**
PostgreSQL materialized views require manual or scheduled execution of `REFRESH MATERIALIZED VIEW`. During a poll's active window, users expect real-time feedback. Materialized views would either be stale or overly tax the database if pseudo-real-time refreshes were forced. QuickPoll relies on table triggers instead.

## 2. PostgreSQL Triggers for Analytics Integrity
**The Problem:** Maintaining the OLAP aggregations requires computational overhead. Where should this logic execute?

**The Solution:** PostgreSQL Database Triggers. Triggers naturally lock the execution context around the row being modified. Every time a vote is successfully inserted, the database synchronously increments the respective `vote_count` inside `analytics_option_breakdown` and logs the interaction inside `analytics_user_participation`.

**Why Database-Level?**
Doing this within the Java layer introduces massive race conditions. If fifty users vote for "Option A" in the exact same millisecond, JPA entity updates would overwrite each other depending on the application cluster's commit sequence. The database is the natural arbiter of truth and atomicity.

## 3. The Eradication of Kafka Processing
**The Problem:** The initial architecture proposed dispatching `VoteCastDomainEvent` to Kafka, where a consumer would retrieve the event and update the analytics table.

**The Reason for Removal:** Over-engineering. For QuickPoll's current constraints, Kafka introduced several unnecessary complexities:
1. **Network Overhead:** Hopping from Spring Boot → Kafka Broker → Spring Boot Consumer → PostgreSQL introduced artificial latency.
2. **Infrastructure Burden:** Maintaining a Zookeeper/Kafka Docker cluster drastically hindered the developer experience and deployment footprint.
3. **Eventual vs. Strong Consistency:** Dashboard readers hitting the UI immediately after voting might see stale analytics because the Kafka consumer hadn't flushed the topic yet.

By substituting Kafka for database triggers, we collapsed the network topology, enforced strict ACID consistency, and significantly reduced the system's operational cost.

## 4. Implicit Contextual Access Control (Role vs. Creator)
**The Problem:** Accessing dashboards required messy programmatic security checks (e.g., throwing `403 Access Denied` if a user wasn't an administrator or hadn't created a poll). These checks necessitated unnecessary `SELECT COUNT()` queries just to authorize a user.

**The Solution:** The backend now relies strictly on Spring Security annotations combined with scoped payload retrieval. 
- Administrative contexts (like `GET /dashboard/top-users`) possess coarse `@PreAuthorize("hasRole('ADMIN')")` boundaries on the controller.
- Dashboard views dynamically scope the `WHERE` clauses to the `user_id`. Instead of validating if a user *should* see the active-polls view, the query executes as `WHERE creator_id = :userId`. If they haven't created any polls, they return a blank page efficiently instead of throwing exceptions. 

This decision isolates security metadata into the SQL abstraction safely without leaking authorization logic into the raw business layer.
