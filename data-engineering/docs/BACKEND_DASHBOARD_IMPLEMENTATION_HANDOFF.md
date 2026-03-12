# QuickPoll Backend Dashboard Implementation Handoff


## 1. Purpose

This document tells the backend developer exactly how to build the dashboard
analytics endpoints for frontend consumption.

It is written to be:

- easy for a human developer to follow
- specific enough for an AI coding agent to implement without guessing
- aligned to the current QuickPoll schema after the Kafka to PostgreSQL trigger
  migration

The backend should treat this document as the source of truth for dashboard
endpoint behavior.

---

## 2. High-Level Rule

The backend should be **OLAP-first** for dashboard reads.

That means:

- read dashboard analytics from the `analytics_*` tables
- use OLTP tables only for authorization and entitlement rules
- do not aggregate raw `votes` at request time for dashboard responses

The backend is still responsible for:

- authentication
- authorization
- creator/admin scope filtering
- participant entitlement checks for poll results
- pagination
- sorting
- converting DB rows into API DTOs
- small summary math like counts, sums, averages, and winner selection

The backend should **not** do:

- heavy vote aggregation from `votes`
- per-request recomputation of option percentages
- per-request recomputation of participation rate
- timeseries bucketing from raw vote timestamps

---

## 3. Product Surfaces

There are two different analytics surfaces in the product.

### A. Creator/Admin Dashboard

This is the performance workspace.

- Admin sees global system analytics
- Creator sees analytics only for polls they created
- Poll participants do not get the creator/admin dashboard

### B. Poll Results Page

This is the user-facing analytics view for one poll.

- Admin can access it
- Poll creator can access it
- An entitled participant can access it
- This powers bar chart, pie chart, and voting trend chart for one poll

These two surfaces must stay separate.

---

## 4. Current Database Reality

## 4.1 OLTP Tables

These are the operational tables from `schema.sql`.

Relevant tables:

- `users`
- `department`
- `department_members`
- `polls`
- `poll_options`
- `poll_invites`
- `votes`

Use OLTP mainly for:

- authentication and role lookup
- existing entitlement logic
- access control for participants

Important OLTP notes:

- `polls` contains `title`, `description`, `question`, `creator_id`,
  `multi_select`, `expires_at`, `active`, `created_at`
- `votes` has a unique constraint on `(poll_id, user_id)`
- `poll_invites` and the current backend domain rules still control who is
  entitled to see a poll

## 4.2 OLAP Tables

These are the analytics tables from the trigger-backed data-engineering layer.

### `analytics_poll_summary`

One row per poll.

Columns currently available:

- `poll_id`
- `creator_id`
- `title`
- `description`
- `creator_name`
- `status`
- `max_selections`
- `expires_at`
- `total_votes`
- `unique_voters`
- `participation_rate`
- `created_at`
- `last_updated`

### `analytics_option_breakdown`

One row per poll option.

Columns currently available:

- `option_id`
- `poll_id`
- `option_text`
- `vote_count`
- `vote_percentage`
- `last_updated`

### `analytics_votes_timeseries`

One row per poll per hour bucket.

Columns currently available:

- `id`
- `poll_id`
- `bucket_time`
- `votes_in_bucket`
- `recorded_at`

### `analytics_user_participation`

One row per user.

Columns currently available:

- `user_id`
- `user_name`
- `total_votes_cast`
- `polls_participated`
- `polls_created`
- `last_active`
- `last_updated`

---

## 5. Trigger and Freshness Behavior

The backend does not need to implement this logic, but it should trust this as
the freshness model of the analytics layer.

What is already handled:

- vote insert refreshes poll summary, option breakdown, timeseries, and voter
  participation
- poll insert creates poll summary and refreshes creator participation
- poll update refreshes poll summary
- poll delete removes analytics rows and refreshes creator participation
- user insert refreshes all poll summaries so participation rate stays correct
- user update refreshes creator name in poll summary and the user participation
  row
- poll option insert creates zero-vote option rows
- poll option update and delete keep option breakdown in sync

Backend implication:

- analytics endpoints should behave like live views over precomputed tables
- if a user votes and then refreshes, the dashboard should reflect the new data
  without backend recomputing analytics from raw votes

---

## 6. Access Rules

| Endpoint Group | Admin | Creator | Participant |
|---|---|---|---|
| `/dashboard/**` | Full access | Only own polls | No access |
| `/dashboard/top-users` | Full access | No access | No access |
| `/polls/{pollId}/results` | Yes | Yes | Yes, if entitled |
| `/polls/{pollId}/results/timeseries` | Yes | Yes | Yes, if entitled |

Scope rules:

- Admin dashboard queries are global
- Creator dashboard queries must filter by `creator_id = currentUser.id`
- Participant entitlement for poll results should reuse the existing backend
  poll-access rules

Do not try to infer participant entitlement from OLAP tables.

---

## 7. API Route Design

Keep the route style already used by the backend.

Recommended controllers:

- `DashboardController` with base route `/dashboard`
- existing `PollController` should expose poll-specific analytics routes

Recommended routes:

- `GET /dashboard/summary`
- `GET /dashboard/active-polls`
- `GET /dashboard/recent-results`
- `GET /dashboard/top-users`
- `GET /polls/{pollId}/results`
- `GET /polls/{pollId}/results/timeseries`

---

## 8. DTOs the Backend Should Add

Add dedicated DTOs for analytics responses.

Recommended DTO names:

- `DashboardSummaryResponse`
- `ActivePollDashboardResponse`
- `RecentResultResponse`
- `WinningOptionResponse`
- `TopUserResponse`
- `PollResultsResponse`
- `PollResultOptionResponse`
- `PollResultsTimeseriesResponse`
- `TimeseriesPointResponse`

Do not reuse generic CRUD poll DTOs for analytics endpoints.

---

## 9. Endpoint-by-Endpoint Implementation Guide

## 9.1 `GET /dashboard/summary`

### Purpose

Returns the KPI cards for the creator/admin dashboard.

### Access

- Admin: all polls
- Creator: only polls where `creator_id = currentUser.id`

### Source Table

- `analytics_poll_summary`

### Query Strategy

Run one aggregate query on `analytics_poll_summary` after applying scope.

For admin:

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_poll_count,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_poll_count,
  COUNT(*) AS total_poll_count,
  COALESCE(SUM(total_votes), 0) AS total_votes_cast,
  COALESCE(ROUND(AVG(participation_rate)::numeric, 2), 0) AS average_participation_rate,
  MAX(last_updated) AS last_refreshed_at
FROM analytics_poll_summary;
```

For creator:

Same query with:

```sql
WHERE creator_id = :currentUserId
```

### Backend Work

Only:

- add creator filter for non-admin
- map SQL result to `DashboardSummaryResponse`

### Response Shape

```json
{
  "activePollCount": 4,
  "closedPollCount": 6,
  "totalPollCount": 10,
  "totalVotesCast": 87,
  "averageParticipationRate": 41.35,
  "lastRefreshedAt": "2026-03-11T10:42:15"
}
```

---

## 9.2 `GET /dashboard/active-polls?page=0&size=10`

### Purpose

Returns the active polls list for the dashboard.

### Access

- Admin: all active polls
- Creator: only active polls they created

### Source Table

- `analytics_poll_summary`

### Query Strategy

Read directly from `analytics_poll_summary`.

Required filter:

```sql
status = 'ACTIVE'
```

Admin query:

```sql
SELECT *
FROM analytics_poll_summary
WHERE status = 'ACTIVE'
ORDER BY last_updated DESC, created_at DESC
LIMIT :size OFFSET :offset;
```

Creator query:

```sql
SELECT *
FROM analytics_poll_summary
WHERE status = 'ACTIVE'
  AND creator_id = :currentUserId
ORDER BY last_updated DESC, created_at DESC
LIMIT :size OFFSET :offset;
```

Count query:

Use the same filter without `ORDER BY`.

### Backend Work

Only:

- apply creator filter when user is not admin
- map rows to `ActivePollDashboardResponse`
- return Spring `Page<ActivePollDashboardResponse>`

### Response Shape

```json
{
  "content": [
    {
      "pollId": 12,
      "title": "Which logo should we ship?",
      "creatorId": 5,
      "creatorName": "Jude Boachie",
      "status": "ACTIVE",
      "createdAt": "2026-03-10T09:15:00",
      "expiresAt": "2026-03-12T09:15:00",
      "totalVotes": 18,
      "uniqueVoters": 18,
      "participationRate": 52.94,
      "lastUpdated": "2026-03-11T10:40:02"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

### Important Note

This endpoint no longer needs an OLTP join for:

- `creator_id`
- `description`
- `max_selections`
- `expires_at`

Those fields are now available in OLAP.

---

## 9.3 `GET /dashboard/recent-results?page=0&size=5`

### Purpose

Returns recently updated polls and the current winning option for each poll.

### Access

- Admin: all polls
- Creator: only polls they created

### Source Tables

- `analytics_poll_summary`
- `analytics_option_breakdown`

### Recommended Read Strategy

Use a **two-step read**. This keeps the implementation simple and avoids
unnecessary native SQL complexity.

### Step 1: Read paged poll summaries

Admin:

```sql
SELECT *
FROM analytics_poll_summary
ORDER BY last_updated DESC
LIMIT :size OFFSET :offset;
```

Creator:

```sql
SELECT *
FROM analytics_poll_summary
WHERE creator_id = :currentUserId
ORDER BY last_updated DESC
LIMIT :size OFFSET :offset;
```

### Step 2: Read options for the returned poll ids

```sql
SELECT *
FROM analytics_option_breakdown
WHERE poll_id IN (:pollIds);
```

### Winner Selection Rule

For each poll:

1. choose highest `vote_count`
2. if tied, choose lowest `option_id`

This can be done in backend service code after fetching the option rows.

This is acceptable because:

- the option rows are already pre-aggregated
- this is light shaping, not heavy analytics

### Backend Work

- fetch paged poll summary rows
- fetch option rows for those poll ids
- group options by `poll_id`
- derive `winningOption`
- return Spring `Page<RecentResultResponse>`

### Response Shape

```json
{
  "content": [
    {
      "pollId": 7,
      "title": "Where should the team retreat be?",
      "creatorId": 2,
      "creatorName": "Abdul Basit",
      "status": "CLOSED",
      "totalVotes": 31,
      "uniqueVoters": 31,
      "participationRate": 91.18,
      "lastUpdated": "2026-03-11T10:39:41",
      "winningOption": {
        "optionId": 21,
        "optionText": "Cape Coast",
        "voteCount": 15,
        "votePercentage": 48.39
      }
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 5,
  "number": 0
}
```

---

## 9.4 `GET /dashboard/top-users?page=0&size=10`

### Purpose

Returns the admin-only engagement leaderboard.

### Access

- Admin only

### Source Table

- `analytics_user_participation`

### Query Strategy

```sql
SELECT *
FROM analytics_user_participation
ORDER BY total_votes_cast DESC, last_active DESC NULLS LAST
LIMIT :size OFFSET :offset;
```

Count query:

```sql
SELECT COUNT(*) FROM analytics_user_participation;
```

### Backend Work

Only:

- enforce admin-only access
- page and sort
- map rows to `TopUserResponse`

### Response Shape

```json
{
  "content": [
    {
      "userId": 10,
      "userName": "Samuel Oduro Duah Boakye",
      "totalVotesCast": 14,
      "pollsParticipated": 9,
      "pollsCreated": 2,
      "lastActive": "2026-03-11T10:35:11",
      "lastUpdated": "2026-03-11T10:35:12"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 10,
  "number": 0
}
```

---

## 9.5 `GET /polls/{pollId}/results`

### Purpose

Returns the data needed for:

- poll summary card
- bar chart
- pie chart

### Access

- Admin: yes
- Creator: yes
- Entitled participant: yes

### Source Tables

- `analytics_poll_summary`
- `analytics_option_breakdown`

### Access Check Order

1. verify authenticated user
2. verify poll exists in application domain
3. verify the user is:
   - admin, or
   - poll creator, or
   - entitled participant under existing backend rules
4. then read analytics tables

### Query Strategy

Poll summary:

```sql
SELECT *
FROM analytics_poll_summary
WHERE poll_id = :pollId;
```

Options:

```sql
SELECT *
FROM analytics_option_breakdown
WHERE poll_id = :pollId
ORDER BY option_id ASC;
```

### Backend Work

Only:

- enforce access
- fetch one summary row
- fetch the option rows
- map to `PollResultsResponse`

### Response Shape

```json
{
  "pollId": 12,
  "title": "Which logo should we ship?",
  "description": "Choose the final option for launch.",
  "creatorId": 5,
  "creatorName": "Jude Boachie",
  "status": "ACTIVE",
  "maxSelections": 1,
  "createdAt": "2026-03-10T09:15:00",
  "expiresAt": "2026-03-12T09:15:00",
  "totalVotes": 18,
  "uniqueVoters": 18,
  "participationRate": 52.94,
  "lastUpdated": "2026-03-11T10:40:02",
  "options": [
    {
      "optionId": 44,
      "optionText": "Option A",
      "voteCount": 11,
      "votePercentage": 61.11
    },
    {
      "optionId": 45,
      "optionText": "Option B",
      "voteCount": 7,
      "votePercentage": 38.89
    }
  ]
}
```

### Important Notes

- zero-vote polls should still return all options with `0` counts and `0`
  percentages
- do not recompute option percentages from `votes`
- current OLAP already carries `description`, `creator_id`, `max_selections`,
  and `expires_at`

### Current Schema Note About `maxSelections`

The OLAP table exposes `max_selections`, but the current base `schema.sql`
still shows `polls.multi_select` rather than a dedicated OLTP
`max_selections` column.

Backend recommendation:

- keep `maxSelections` in the API contract
- trust the analytics table value
- treat current `1` as the safe default for single-select polls

---

## 9.6 `GET /polls/{pollId}/results/timeseries`

### Purpose

Returns the voting trend points for a single poll.

### Access

Same as `/polls/{pollId}/results`.

### Source Table

- `analytics_votes_timeseries`

### Query Parameters

- optional `from`
- optional `to`

### Query Strategy

```sql
SELECT poll_id, bucket_time, votes_in_bucket
FROM analytics_votes_timeseries
WHERE poll_id = :pollId
  AND (:from IS NULL OR bucket_time >= :from)
  AND (:to IS NULL OR bucket_time <= :to)
ORDER BY bucket_time ASC;
```

### Backend Work

Only:

- enforce access
- apply optional date filters
- map rows to `TimeseriesPointResponse`

### Response Shape

```json
{
  "pollId": 12,
  "points": [
    {
      "bucketTime": "2026-03-11T08:00:00",
      "votesInBucket": 4
    },
    {
      "bucketTime": "2026-03-11T09:00:00",
      "votesInBucket": 6
    },
    {
      "bucketTime": "2026-03-11T10:00:00",
      "votesInBucket": 8
    }
  ]
}
```

---

## 10. Query Rules and Mapping Rules

### JSON field naming

Return camelCase JSON to the frontend.

Examples:

- `poll_id` -> `pollId`
- `creator_id` -> `creatorId`
- `creator_name` -> `creatorName`
- `max_selections` -> `maxSelections`
- `unique_voters` -> `uniqueVoters`
- `participation_rate` -> `participationRate`
- `last_updated` -> `lastUpdated`

### Timestamp formatting

Return ISO-8601 timestamps consistently.

### Percentage formatting

Percentages should be returned rounded to 2 decimal places.

### Page response shape

For list endpoints, return Spring `Page<...>`.

Frontend depends mainly on:

- `content`
- `number`
- `size`
- `totalElements`
- `totalPages`

---

## 11. What Backend Can Read Directly From OLAP

The backend can now read these directly from OLAP without joining `polls`:

- `creatorId`
- `title`
- `description`
- `creatorName`
- `status`
- `maxSelections`
- `expiresAt`
- `totalVotes`
- `uniqueVoters`
- `participationRate`
- `createdAt`
- `lastUpdated`

The backend can also read these directly from OLAP:

- option labels and percentages
- per-hour vote buckets
- total votes cast by user
- polls participated in
- polls created
- last active

This means the backend should not need complex data shaping logic anymore.

---

## 12. What Backend Still Uses OLTP For

Use OLTP and domain services for:

- authentication
- role checks
- verifying poll existence in the main app domain
- participant entitlement checks
- any route-level ownership rules not already enforced above the repository

Do not use OLTP for dashboard analytics computation.

---

## 13. Recommended Repository/Service Split

Recommended structure:

- `DashboardController`
- `DashboardService`
- `DashboardRepository`
- `PollAnalyticsRepository` or extend existing poll repository for analytics-only
  reads

Recommended service behavior:

- dashboard service handles admin/creator scope branching
- poll analytics service handles poll result entitlement and response shaping
- repositories return already-filtered OLAP rows or projections

---

## 14. Error Handling

Use the normal REST responses:

- `401 Unauthorized` for unauthenticated users
- `403 Forbidden` for authenticated users without access
- `404 Not Found` for missing polls
- `200 OK` for successful reads

Examples:

- creator calling `/dashboard/summary` -> `200`
- participant calling `/dashboard/summary` -> `403`
- entitled participant calling `/polls/12/results` -> `200`
- any user calling `/polls/999/results` for a nonexistent poll -> `404`

---

## 15. Acceptance Checklist

- [ ] `/dashboard/summary` reads only from `analytics_poll_summary`
- [ ] `/dashboard/active-polls` reads only from `analytics_poll_summary`
- [ ] `/dashboard/recent-results` reads from `analytics_poll_summary` and `analytics_option_breakdown`
- [ ] `/dashboard/top-users` reads only from `analytics_user_participation`
- [ ] `/polls/{pollId}/results` reads from `analytics_poll_summary` and `analytics_option_breakdown`
- [ ] `/polls/{pollId}/results/timeseries` reads only from `analytics_votes_timeseries`
- [ ] creator scope uses `creator_id`
- [ ] poll results still enforce participant entitlement through existing app rules
- [ ] no dashboard endpoint aggregates raw `votes`
- [ ] list endpoints return Spring `Page<...>`
- [ ] timestamps are ISO-8601
- [ ] percentages are rounded to 2 decimals

---

## 16. Final Instruction

If you are implementing this in backend:

1. trust the analytics tables for dashboard numbers
2. keep authorization in the backend domain
3. do only light response shaping
4. do not rebuild analytics from raw votes

That is the intended division of responsibility in the current QuickPoll
architecture.
