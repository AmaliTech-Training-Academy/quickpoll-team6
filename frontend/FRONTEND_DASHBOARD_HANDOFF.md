# QuickPoll Frontend Dashboard Angular Handoff

**Author:** Henry Nana Antwi  
**Audience:** Frontend developer  
**Project:** QuickPoll Team 6  
**Last Updated:** March 12, 2026

---

## 1. Purpose

This document tells the frontend developer exactly how to consume the dashboard
analytics endpoints from the backend and render them in the Angular app.

It is written to be:

- easy for a human frontend developer to follow
- specific enough for an AI coding agent to implement directly
- aligned to the current Angular 21 frontend structure in this repo

This document assumes:

- the backend exposes the analytics endpoints defined in the backend dashboard
  handoff
- the frontend consumes those endpoints through Angular services
- the frontend never queries analytics tables directly

---

## 2. Current Frontend Reality

These are the current frontend facts from the repo.

### Angular app

- Angular 21
- standalone components
- `ChangeDetectionStrategy.OnPush` already used in pages/components
- route alias `@/*` points to `src/app/*`

### Existing files relevant to dashboard work

- `frontend/src/app/services/poll.service.ts`
- `frontend/src/app/models.ts`
- `frontend/src/app/constants.ts`
- `frontend/src/app/pages/poll-metrics.component.ts`
- `frontend/src/app/app.routes.ts`

### Current route slot already exists

The app already has:

- `~/polls/:id/metrics`

That route currently points to `PollMetricsComponent`, but the component is
still empty. This is the correct place for the single-poll analytics page.

### Current service reality

`PollService` already has:

- `getResults(id)`

It does **not** yet have:

- dashboard endpoints
- timeseries endpoint

### Current model reality

`frontend/src/app/models.ts` already has a `PollResult` type, but it does not
yet match the full analytics contract needed now.

---

## 3. Product Surfaces the Frontend Must Build

Do not mix these two surfaces together.

### A. Creator/Admin Dashboard Page

This is the overview analytics workspace.

It should show:

- KPI summary cards
- active polls list
- recent results list
- top users leaderboard for admins only

### B. Poll Metrics Page

This is the analytics page for one poll.

It should show:

- poll summary information
- bar chart
- pie chart
- voting trend chart

Use the existing route:

- `~/polls/:id/metrics`

---

## 4. Access and Visibility Rules

The backend enforces access. The frontend should render the correct experience.

### Creator/Admin dashboard

- Admin can see the full dashboard
- Creator can see only their scoped dashboard data
- Participant should not see the creator/admin dashboard

### Poll metrics page

- Admin can see it
- Creator can see it
- Entitled participant can see it

Frontend implication:

- hide admin-only leaderboard from non-admin users
- if backend returns `403`, show a permission state instead of trying to work
  around it

---

## 5. Backend Endpoints the Frontend Should Use

Assume the backend base is:

```ts
API_BASE_URL
```

Current app already sets this in:

- `frontend/src/app/constants.ts`

Use these endpoint fragments:

- `GET /dashboard/summary`
- `GET /dashboard/active-polls?page=0&size=10`
- `GET /dashboard/recent-results?page=0&size=5`
- `GET /dashboard/top-users?page=0&size=10`
- `GET /polls/{pollId}/results`
- `GET /polls/{pollId}/results/timeseries`

In Angular service code, that means:

- `${API_BASE_URL}/dashboard/summary`
- `${API_BASE_URL}/dashboard/active-polls`
- `${API_BASE_URL}/dashboard/recent-results`
- `${API_BASE_URL}/dashboard/top-users`
- `${API_BASE_URL}/polls/${id}/results`
- `${API_BASE_URL}/polls/${id}/results/timeseries`

---

## 6. Frontend Types to Add

Add or update these interfaces in:

- `frontend/src/app/models.ts`

## 6.1 Shared pagination type

```ts
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

## 6.2 Dashboard types

```ts
export interface DashboardSummary {
  activePollCount: number;
  closedPollCount: number;
  totalPollCount: number;
  totalVotesCast: number;
  averageParticipationRate: number;
  lastRefreshedAt: string | null;
}

export interface ActivePollItem {
  pollId: number;
  title: string;
  creatorId: number;
  creatorName: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string | null;
  expiresAt: string | null;
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  lastUpdated: string | null;
}

export interface WinningOption {
  optionId: number;
  optionText: string;
  voteCount: number;
  votePercentage: number;
}

export interface RecentResultItem {
  pollId: number;
  title: string;
  creatorId: number;
  creatorName: string;
  status: 'ACTIVE' | 'CLOSED';
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  lastUpdated: string | null;
  winningOption: WinningOption;
}

export interface TopUser {
  userId: number;
  userName: string;
  totalVotesCast: number;
  pollsParticipated: number;
  pollsCreated: number;
  lastActive: string | null;
  lastUpdated: string | null;
}
```

## 6.3 Poll analytics types

```ts
export interface PollAnalyticsOption {
  optionId: number;
  optionText: string;
  voteCount: number;
  votePercentage: number;
}

export interface PollAnalyticsResult {
  pollId: number;
  title: string;
  description: string | null;
  creatorId: number;
  creatorName: string;
  status: 'ACTIVE' | 'CLOSED';
  maxSelections: number;
  createdAt: string | null;
  expiresAt: string | null;
  totalVotes: number;
  uniqueVoters: number;
  participationRate: number;
  lastUpdated: string | null;
  options: PollAnalyticsOption[];
}

export interface TimeseriesPoint {
  bucketTime: string;
  votesInBucket: number;
}

export interface PollTimeseriesResponse {
  pollId: number;
  points: TimeseriesPoint[];
}
```

---

## 7. What to Change in Existing Angular Code

## 7.1 Keep and extend `PollService`

Current file:

- `frontend/src/app/services/poll.service.ts`

Keep:

- `getResults(id)`

But update it to return the new analytics result type:

- `Observable<PollAnalyticsResult>`

Add:

- `getResultsTimeseries(id: number, from?: string, to?: string): Observable<PollTimeseriesResponse>`

## 7.2 Add a new `DashboardService`

Create:

- `frontend/src/app/services/dashboard.service.ts`

Recommended methods:

```ts
getSummary(): Observable<DashboardSummary>
getActivePolls(page = 0, size = 10): Observable<PageResponse<ActivePollItem>>
getRecentResults(page = 0, size = 5): Observable<PageResponse<RecentResultItem>>
getTopUsers(page = 0, size = 10): Observable<PageResponse<TopUser>>
```

Base URL:

```ts
private readonly dashboardApiUrl = `${API_BASE_URL}/dashboard`;
```

## 7.3 Add a dashboard page

Create a creator/admin overview page component.

Recommended file:

- `frontend/src/app/pages/dashboard.component.ts`

Recommended route:

- `~/dashboard`

Add it under the authenticated `~` layout in `app.routes.ts`.

## 7.4 Keep `PollMetricsComponent`

Use:

- `frontend/src/app/pages/poll-metrics.component.ts`

This component should consume:

- `PollService.getResults(id)`
- `PollService.getResultsTimeseries(id, from?, to?)`

---

## 8. UI Mapping: Which Endpoint Feeds Which Widget

| UI Element | Endpoint |
|---|---|
| Summary cards | `/dashboard/summary` |
| Active polls table/list | `/dashboard/active-polls` |
| Recent results cards/list | `/dashboard/recent-results` |
| Admin leaderboard | `/dashboard/top-users` |
| Poll summary card | `/polls/{pollId}/results` |
| Bar chart | `/polls/{pollId}/results` |
| Pie chart | `/polls/{pollId}/results` |
| Trend chart | `/polls/{pollId}/results/timeseries` |

This means the frontend does not need to transform data heavily before
rendering charts.

---

## 9. Dashboard Page Implementation Guide

## 9.1 Component responsibility

`DashboardComponent` should:

- fetch summary cards
- fetch active polls
- fetch recent results
- fetch top users only if current user is admin
- expose loading, error, and empty states

## 9.2 Recommended fetch flow

On component init:

1. read current user role from the existing auth state/service
2. request:
   - summary
   - active polls
   - recent results
3. if role is admin, also request top users

Recommended Angular pattern:

- use `forkJoin` for the one-time dashboard load
- keep `OnPush`
- store state in component properties or signals

Example logical flow:

```ts
forkJoin({
  summary: this.dashboardService.getSummary(),
  activePolls: this.dashboardService.getActivePolls(0, 10),
  recentResults: this.dashboardService.getRecentResults(0, 5),
  topUsers: isAdmin ? this.dashboardService.getTopUsers(0, 10) : of(null),
})
```

## 9.3 Recommended page sections

Top section:

- active polls count
- closed polls count
- total polls count
- total votes cast
- average participation rate

Middle section:

- active polls list
- recent results list

Bottom section:

- admin-only top users leaderboard

## 9.4 Empty states

If creator has no polls:

- show empty KPI state with zeros
- show "No active polls yet"
- show "No recent results yet"

If admin has no user activity yet:

- show an empty leaderboard message

---

## 10. Poll Metrics Page Implementation Guide

## 10.1 Component responsibility

`PollMetricsComponent` should:

- read the `id` route parameter
- fetch poll summary + option breakdown
- fetch timeseries
- render the poll metrics view

## 10.2 Recommended fetch flow

On component init:

1. read `id` from `ActivatedRoute`
2. call both analytics endpoints
3. store response state

Recommended Angular pattern:

- use `ActivatedRoute.paramMap`
- parse `id`
- use `switchMap` into a `forkJoin`

Example logical flow:

```ts
this.route.paramMap.pipe(
  map((params) => Number(params.get('id'))),
  switchMap((pollId) =>
    forkJoin({
      results: this.pollService.getResults(pollId),
      timeseries: this.pollService.getResultsTimeseries(pollId),
    })
  )
)
```

## 10.3 What the component should render

Summary block:

- title
- description
- creator name
- status
- total votes
- unique voters
- participation rate
- created at
- expires at

Bar chart:

- labels = `options[].optionText`
- values = `options[].voteCount`

Pie chart:

- labels = `options[].optionText`
- values = `options[].votePercentage`

Trend chart:

- x-axis = `points[].bucketTime`
- y-axis = `points[].votesInBucket`

## 10.4 Recommended display rules

- if `expiresAt` is null, show "No expiry"
- if there are zero votes, show charts with zero values instead of hiding them
- if `points` is empty, show "No trend data yet"
- if poll is not found, show a not-found state
- if backend returns `403`, show a permission message

---

## 11. Handling Existing Model Mismatch

Current `models.ts` contains:

- `PollResultOption` with `id` and `text`
- `PollResult` with older fields and without `uniqueVoters`,
  `participationRate`, `creatorId`, or `lastUpdated`

This is no longer enough for the dashboard analytics contract.

Recommended approach:

- keep old types only if some existing screen still needs them
- add the new analytics-specific interfaces listed above
- update `PollService.getResults()` to return `PollAnalyticsResult`

Do not force the new analytics endpoint into the old shape.

---

## 12. Loading, Error, and Refresh Behavior

## 12.1 Loading states

Dashboard page:

- show skeletons or loading placeholders for cards and lists

Poll metrics page:

- show loading state for the entire metrics page until both results and
  timeseries return

## 12.2 Error states

`401`:

- let existing auth flow redirect to login or session recovery

`403`:

- show "You do not have permission to view this analytics view"

`404`:

- show "Poll not found"

generic network failure:

- show a retry action

## 12.3 Refresh strategy

Required:

- load on component init
- refresh after a successful vote action

Optional but recommended:

- if viewing `~/polls/:id/metrics` and the poll is still active, refresh every
  10 seconds

Do not poll the dashboard aggressively unless needed.

---

## 13. Charting Guidance

The backend payload is already chart-ready.

Frontend only needs light mapping.

### Bar chart input

From `PollAnalyticsResult.options`:

- category label = `optionText`
- numeric value = `voteCount`

### Pie chart input

From `PollAnalyticsResult.options`:

- label = `optionText`
- numeric value = `votePercentage`

### Trend chart input

From `PollTimeseriesResponse.points`:

- x = `bucketTime`
- y = `votesInBucket`

Do not ask the backend for a second chart-specific shape.

---

## 14. Recommended Angular File-Level Changes

This is the recommended implementation footprint.

Add:

- `frontend/src/app/services/dashboard.service.ts`
- `frontend/src/app/pages/dashboard.component.ts`

Update:

- `frontend/src/app/services/poll.service.ts`
- `frontend/src/app/models.ts`
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/pages/poll-metrics.component.ts`

---

## 15. Acceptance Checklist

- [ ] add dashboard DTO interfaces to `models.ts`
- [ ] add `DashboardService`
- [ ] extend `PollService` with timeseries support
- [ ] add authenticated `~/dashboard` route
- [ ] keep and implement `~/polls/:id/metrics`
- [ ] dashboard page loads summary, active polls, and recent results
- [ ] admin dashboard also loads top users
- [ ] poll metrics page renders summary, bar chart, pie chart, and trend chart
- [ ] frontend handles `401`, `403`, `404`, and generic failures
- [ ] no frontend code queries analytics tables directly

---

## 16. Final Instruction

If you are implementing the frontend:

1. call the backend analytics endpoints
2. keep Angular typing explicit in `models.ts`
3. use `DashboardService` for `/dashboard/**`
4. use `PollService` for `/polls/{id}/results*`
5. keep the dashboard page and poll metrics page separate

The backend is responsible for access and analytics computation.
The frontend is responsible for fetching, typing, rendering, and user states.
