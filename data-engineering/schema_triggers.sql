-- =============================================================================
-- schema_triggers.sql
-- PostgreSQL trigger functions and triggers for QuickPoll real-time analytics.
--
-- Replaces the Kafka consumer pipeline. Triggers fire on OLTP writes and upsert
-- into the analytics tables, performing the same aggregations previously
-- computed by the Python Kafka consumer and backfill transformers.
--
-- Idempotent: safe to execute multiple times on every pipeline startup.
--   - Functions use CREATE OR REPLACE FUNCTION
--   - Triggers use DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   - All inserts use ON CONFLICT ... DO UPDATE
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Schema compatibility for existing analytics tables
-- ---------------------------------------------------------------------------
ALTER TABLE analytics_poll_summary
    ADD COLUMN IF NOT EXISTS creator_id BIGINT;

ALTER TABLE analytics_poll_summary
    ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE analytics_poll_summary
    ADD COLUMN IF NOT EXISTS max_selections INTEGER DEFAULT 1;

ALTER TABLE analytics_poll_summary
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_analytics_poll_summary_creator_status_updated
    ON analytics_poll_summary (creator_id, status, last_updated);

CREATE INDEX IF NOT EXISTS idx_analytics_poll_summary_last_updated
    ON analytics_poll_summary (last_updated);

CREATE INDEX IF NOT EXISTS idx_analytics_option_breakdown_poll_id
    ON analytics_option_breakdown (poll_id);

CREATE INDEX IF NOT EXISTS idx_analytics_user_participation_votes_last_active
    ON analytics_user_participation (total_votes_cast, last_active);


-- ---------------------------------------------------------------------------
-- Function 1: fn_refresh_poll_summary
-- Replicates compute_poll_summary() from transformers.py.
-- Called when votes, polls, or registered-user count change.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_poll_summary(p_poll_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_total_users INT;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;

    INSERT INTO analytics_poll_summary (
        poll_id,
        creator_id,
        title,
        description,
        creator_name,
        status,
        max_selections,
        expires_at,
        total_votes,
        unique_voters,
        participation_rate,
        created_at,
        last_updated
    )
    SELECT
        p.id AS poll_id,
        p.creator_id,
        COALESCE(to_jsonb(p)->>'title', to_jsonb(p)->>'question') AS title,
        p.description,
        u.full_name AS creator_name,
        CASE WHEN p.active THEN 'ACTIVE' ELSE 'CLOSED' END AS status,
        COALESCE(NULLIF(to_jsonb(p)->>'max_selections', '')::INT, 1)
            AS max_selections,
        p.expires_at,
        COALESCE(v.total_votes, 0) AS total_votes,
        COALESCE(v.unique_voters, 0) AS unique_voters,
        ROUND(
            COALESCE(v.unique_voters, 0)::NUMERIC
            / GREATEST(v_total_users, 1) * 100,
            2
        ) AS participation_rate,
        p.created_at,
        NOW() AS last_updated
    FROM polls p
    JOIN users u ON p.creator_id = u.id
    LEFT JOIN (
        SELECT
            poll_id,
            COUNT(*) AS total_votes,
            COUNT(DISTINCT user_id) AS unique_voters
        FROM votes
        WHERE poll_id = p_poll_id
        GROUP BY poll_id
    ) v ON v.poll_id = p.id
    WHERE p.id = p_poll_id
    ON CONFLICT (poll_id) DO UPDATE SET
        creator_id = EXCLUDED.creator_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        creator_name = EXCLUDED.creator_name,
        status = EXCLUDED.status,
        max_selections = EXCLUDED.max_selections,
        expires_at = EXCLUDED.expires_at,
        total_votes = EXCLUDED.total_votes,
        unique_voters = EXCLUDED.unique_voters,
        participation_rate = EXCLUDED.participation_rate,
        created_at = EXCLUDED.created_at,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Helper: refresh all poll summaries for a given creator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_poll_summaries_by_creator(p_creator_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_poll_id BIGINT;
BEGIN
    FOR v_poll_id IN
        SELECT id FROM polls WHERE creator_id = p_creator_id
    LOOP
        PERFORM fn_refresh_poll_summary(v_poll_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Helper: refresh every poll summary
-- Used when a new user changes the participation-rate denominator.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_all_poll_summaries()
RETURNS VOID AS $$
DECLARE
    v_poll_id BIGINT;
BEGIN
    FOR v_poll_id IN
        SELECT id FROM polls
    LOOP
        PERFORM fn_refresh_poll_summary(v_poll_id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function 2: fn_refresh_option_breakdown
-- Replicates compute_option_breakdown() from transformers.py.
-- Also removes stale analytics rows when options are renamed or deleted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_option_breakdown(p_poll_id BIGINT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM analytics_option_breakdown aob
    WHERE aob.poll_id = p_poll_id
      AND NOT EXISTS (
          SELECT 1
          FROM poll_options po
          WHERE po.id = aob.option_id
            AND po.poll_id = p_poll_id
      );

    INSERT INTO analytics_option_breakdown (
        option_id,
        poll_id,
        option_text,
        vote_count,
        vote_percentage,
        last_updated
    )
    SELECT
        po.id AS option_id,
        po.poll_id,
        po.option_text,
        COALESCE(vc.cnt, 0) AS vote_count,
        ROUND(
            COALESCE(vc.cnt, 0)::NUMERIC
            / GREATEST(COALESCE(pt.poll_total, 0), 1) * 100,
            2
        ) AS vote_percentage,
        NOW() AS last_updated
    FROM poll_options po
    LEFT JOIN (
        SELECT option_id, COUNT(*) AS cnt
        FROM votes
        WHERE poll_id = p_poll_id
        GROUP BY option_id
    ) vc ON vc.option_id = po.id
    LEFT JOIN (
        SELECT COUNT(*) AS poll_total
        FROM votes
        WHERE poll_id = p_poll_id
    ) pt ON TRUE
    WHERE po.poll_id = p_poll_id
    ON CONFLICT (option_id) DO UPDATE SET
        poll_id = EXCLUDED.poll_id,
        option_text = EXCLUDED.option_text,
        vote_count = EXCLUDED.vote_count,
        vote_percentage = EXCLUDED.vote_percentage,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function 3: fn_refresh_votes_timeseries
-- Replicates the hourly bucket upsert from _handle_vote_event() in streaming.py.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_votes_timeseries(
    p_poll_id BIGINT,
    p_vote_time TIMESTAMP
)
RETURNS VOID AS $$
DECLARE
    v_bucket TIMESTAMP;
    v_count INT;
BEGIN
    v_bucket := date_trunc('hour', COALESCE(p_vote_time, NOW()));

    SELECT COUNT(*) INTO v_count
    FROM votes
    WHERE poll_id = p_poll_id
      AND date_trunc('hour', COALESCE(created_at, p_vote_time)) = v_bucket;

    INSERT INTO analytics_votes_timeseries (
        poll_id,
        bucket_time,
        votes_in_bucket,
        recorded_at
    )
    VALUES (p_poll_id, v_bucket, v_count, NOW())
    ON CONFLICT ON CONSTRAINT uq_timeseries_poll_bucket DO UPDATE SET
        votes_in_bucket = EXCLUDED.votes_in_bucket,
        recorded_at = EXCLUDED.recorded_at;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function 4: fn_refresh_user_participation
-- Replicates compute_user_participation() from transformers.py.
-- last_active reflects the latest of vote activity or poll creation activity.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_user_participation(p_user_id BIGINT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_user_participation (
        user_id,
        user_name,
        total_votes_cast,
        polls_participated,
        polls_created,
        last_active,
        last_updated
    )
    SELECT
        u.id AS user_id,
        u.full_name AS user_name,
        COALESCE(va.total_votes_cast, 0) AS total_votes_cast,
        COALESCE(va.polls_participated, 0) AS polls_participated,
        COALESCE(pc.polls_created, 0) AS polls_created,
        CASE
            WHEN va.last_vote_at IS NULL THEN pc.last_created_poll
            WHEN pc.last_created_poll IS NULL THEN va.last_vote_at
            ELSE GREATEST(va.last_vote_at, pc.last_created_poll)
        END AS last_active,
        NOW() AS last_updated
    FROM users u
    LEFT JOIN (
        SELECT
            user_id,
            COUNT(*) AS total_votes_cast,
            COUNT(DISTINCT poll_id) AS polls_participated,
            MAX(created_at) AS last_vote_at
        FROM votes
        WHERE user_id = p_user_id
        GROUP BY user_id
    ) va ON va.user_id = u.id
    LEFT JOIN (
        SELECT
            creator_id,
            COUNT(*) AS polls_created,
            MAX(created_at) AS last_created_poll
        FROM polls
        WHERE creator_id = p_user_id
        GROUP BY creator_id
    ) pc ON pc.creator_id = u.id
    WHERE u.id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        user_name = EXCLUDED.user_name,
        total_votes_cast = EXCLUDED.total_votes_cast,
        polls_participated = EXCLUDED.polls_participated,
        polls_created = EXCLUDED.polls_created,
        last_active = EXCLUDED.last_active,
        last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Helper: remove a deleted poll's analytics rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_delete_poll_analytics(p_poll_id BIGINT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM analytics_option_breakdown WHERE poll_id = p_poll_id;
    DELETE FROM analytics_votes_timeseries WHERE poll_id = p_poll_id;
    DELETE FROM analytics_poll_summary WHERE poll_id = p_poll_id;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- Trigger wrapper functions and trigger definitions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1: After a vote is inserted — refresh all four analytics tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_vote_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.poll_id);
    PERFORM fn_refresh_option_breakdown(NEW.poll_id);
    PERFORM fn_refresh_votes_timeseries(NEW.poll_id, NEW.created_at);
    PERFORM fn_refresh_user_participation(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vote_after_insert ON votes;
CREATE TRIGGER trg_vote_after_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_vote_insert();


-- ---------------------------------------------------------------------------
-- Trigger 2: After a poll is inserted — initialize its summary row and
-- refresh the creator's participation stats.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_poll_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.id);
    PERFORM fn_refresh_user_participation(NEW.creator_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_after_insert ON polls;
CREATE TRIGGER trg_poll_after_insert
    AFTER INSERT ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_poll_insert();


-- ---------------------------------------------------------------------------
-- Trigger 3: After a poll is updated — refresh summary and creator stats if
-- ownership changes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_poll_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.id);

    IF OLD.creator_id IS DISTINCT FROM NEW.creator_id THEN
        PERFORM fn_refresh_user_participation(OLD.creator_id);
        PERFORM fn_refresh_user_participation(NEW.creator_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_after_update ON polls;
CREATE TRIGGER trg_poll_after_update
    AFTER UPDATE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_poll_update();


-- ---------------------------------------------------------------------------
-- Trigger 4: After a poll is deleted — remove analytics rows and refresh the
-- creator's participation stats.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_poll_delete()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_delete_poll_analytics(OLD.id);
    PERFORM fn_refresh_user_participation(OLD.creator_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_after_delete ON polls;
CREATE TRIGGER trg_poll_after_delete
    AFTER DELETE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_poll_delete();


-- ---------------------------------------------------------------------------
-- Trigger 5: After a user is inserted — initialize participation and refresh
-- all poll summaries because participation-rate denominator changed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_user_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_user_participation(NEW.id);
    PERFORM fn_refresh_all_poll_summaries();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_after_insert ON users;
CREATE TRIGGER trg_user_after_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_user_insert();


-- ---------------------------------------------------------------------------
-- Trigger 6: After a user is updated — refresh their participation row and
-- any poll summaries that display their creator name.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_user_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_user_participation(NEW.id);

    IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
        PERFORM fn_refresh_poll_summaries_by_creator(NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_after_update ON users;
CREATE TRIGGER trg_user_after_update
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_user_update();


-- ---------------------------------------------------------------------------
-- Trigger 7: After a poll option is inserted — initialize its breakdown row
-- with zero votes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_option_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_option_breakdown(NEW.poll_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_option_after_insert ON poll_options;
CREATE TRIGGER trg_option_after_insert
    AFTER INSERT ON poll_options
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_option_insert();


-- ---------------------------------------------------------------------------
-- Trigger 8: After a poll option is updated — refresh option breakdown rows
-- for the affected poll(s).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_option_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.poll_id IS DISTINCT FROM NEW.poll_id THEN
        PERFORM fn_refresh_option_breakdown(OLD.poll_id);
    END IF;

    PERFORM fn_refresh_option_breakdown(NEW.poll_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_option_after_update ON poll_options;
CREATE TRIGGER trg_option_after_update
    AFTER UPDATE ON poll_options
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_option_update();


-- ---------------------------------------------------------------------------
-- Trigger 9: After a poll option is deleted — remove stale analytics rows.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_option_delete()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_option_breakdown(OLD.poll_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_option_after_delete ON poll_options;
CREATE TRIGGER trg_option_after_delete
    AFTER DELETE ON poll_options
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_option_delete();
