# Analytics Metric Definitions

Definitions for KPIs computed by the data-engineering pipeline and exposed to the dashboard.

---

## participation_rate

**Table:** `analytics_poll_summary`, `analytics_user_participation` (context-dependent)

**Formula:** `(distinct_voters / total_registered_users) × 100`

**Description:** Percentage of registered users who voted in a given poll. Measures poll reach.

**Unit:** Percentage (0–100)

**Example:** 50 users, 10 voted → `participation_rate = 20.0`

---

## vote_percentage

**Table:** `analytics_option_breakdown`

**Formula:** `(vote_count / total_votes_for_poll) × 100`

**Description:** Share of votes for each option within a poll. Sums to 100% per poll.

**Unit:** Percentage (0–100)

**Example:** Option A: 30 votes, Option B: 70 votes → A = 30%, B = 70%

---

## votes_in_bucket

**Table:** `analytics_votes_timeseries`

**Formula:** Count of votes per poll, grouped by hour.

**Description:** Number of votes cast in each hourly bucket. Used for trend charts.

**Unit:** Integer

**Bucket:** `vote.created_at` floored to the hour (e.g. `2026-03-09 14:00:00`)

---

## total_votes

**Table:** `analytics_poll_summary`

**Description:** Total number of votes cast in a poll (across all options).

**Unit:** Integer

---

## unique_voters

**Table:** `analytics_poll_summary`

**Description:** Count of distinct users who voted in a poll. One vote per user per poll.

**Unit:** Integer

---

## Kafka Event Schemas

### vote_events

```json
{
  "event_type": "VOTE_CAST",
  "poll_id": 1,
  "user_id": 5,
  "option_id": 3,
  "occurred_at": "2026-03-09T14:30:00Z"
}
```

### poll_events

```json
{
  "event_type": "POLL_CREATED",
  "poll_id": 1,
  "creator_id": 2,
  "occurred_at": "2026-03-09T14:00:00Z"
}
```

For `POLL_CLOSED`, same structure with `event_type: "POLL_CLOSED"`.
