# Schema Alignment: Backend vs Data Engineering

This document describes how the backend (Spring Boot JPA) schema aligns with the data-engineering pipeline expectations.

## Core Tables (Aligned)

### users

| Backend (User.java) | data-engineering | Notes |
|---------------------|------------------|-------|
| id (BIGINT)         | id               | OK    |
| email               | email            | OK    |
| full_name           | full_name        | OK    |
| role                | role             | OK    |
| created_at          | created_at       | OK    |

Extractors use `full_name` for creator_name and user_name.

### polls

| Backend (Poll.java) | data-engineering | Notes |
|---------------------|------------------|-------|
| id                  | id               | OK    |
| title               | title            | OK    |
| description         | description      | OK    |
| creator_id          | creator_id       | OK    |
| multi_select        | multi_select     | OK    |
| expires_at          | expires_at       | OK    |
| active              | active           | OK    |
| created_at          | created_at       | OK    |

**Note:** data-engineering `schema.sql` includes a `question` column for standalone dev. The backend uses `title` only. Extractors use `COALESCE(title, question)` so both work.

### poll_options

| Backend (PollOption.java) | data-engineering | Notes |
|---------------------------|------------------|-------|
| id                        | id               | OK    |
| poll_id                   | poll_id          | OK    |
| option_text               | option_text      | OK    |
| vote_count                | vote_count       | OK    |

Table name: `poll_options` (both).

### votes

| Backend (Vote.java) | data-engineering | Notes |
|---------------------|------------------|-------|
| id                  | id               | OK    |
| poll_id             | poll_id          | OK    |
| option_id           | option_id        | OK — references poll_options.id |
| user_id             | user_id          | OK    |
| created_at          | created_at       | OK    |

Unique constraint: `(poll_id, user_id)` — one vote per user per poll.

---

## Tables in schema.sql Not Yet in Backend

The data-engineering `schema.sql` includes tables for future features:

- **department** — for department-scoped polls (QP-05, QP-06)
- **department_members** — links users to departments
- **poll_invites** — department-based poll invitations

The pipeline extractors do **not** use these tables. When the backend adds department support, ensure column names match.

---

## Column Mapping for Extractors

| Extractor output | Source |
|------------------|--------|
| title            | COALESCE(polls.title, polls.question) |
| creator_name     | users.full_name |
| option_id        | votes.option_id → poll_options.id |

---

## Recommendations

1. **Backend schema changes:** If the backend adds or renames columns, update `extractors.py` and this doc.
2. **Department tables:** When QP-05 is implemented, add department joins to extractors if dashboard needs per-department metrics.
3. **Naming:** Backend uses `full_name`; avoid `display_name` or `name` unless both are added.
