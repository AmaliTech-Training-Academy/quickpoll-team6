-- =============================================================================
-- schema_triggers.sql
-- PostgreSQL trigger functions and triggers for QuickPoll real-time analytics.
--
-- Replaces the Kafka consumer pipeline. Triggers fire on OLTP writes and upsert
-- into the four analytics tables, performing the same aggregations previously
-- computed by the Python Kafka consumer (transformers.py / streaming.py).
--
-- Idempotent: safe to execute multiple times on every pipeline startup.
--   - Functions use CREATE OR REPLACE FUNCTION
--   - Triggers use DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   - All inserts use ON CONFLICT ... DO UPDATE
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Function 1: fn_refresh_poll_summary
-- Replicates compute_poll_summary() from transformers.py.
-- Called when a vote, poll insert, or poll update occurs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_poll_summary(p_poll_id BIGINT)
RETURNS VOID AS $$
DECLARE
    v_total_users INT;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM users;

    INSERT INTO analytics_poll_summary (
        poll_id,
        title,
        creator_name,
        status,
        total_votes,
        unique_voters,
        participation_rate,
        created_at,
        last_updated
    )
    SELECT
        p.id                                              AS poll_id,
        COALESCE(p.title, p.question)                     AS title,
        u.full_name                                       AS creator_name,
        CASE WHEN p.active THEN 'ACTIVE' ELSE 'CLOSED' END AS status,
        COALESCE(v.total_votes, 0)                        AS total_votes,
        COALESCE(v.unique_voters, 0)                      AS unique_voters,
        ROUND(
            COALESCE(v.unique_voters, 0)::NUMERIC
            / GREATEST(v_total_users, 1) * 100,
            2
        )                                                 AS participation_rate,
        p.created_at,
        NOW()                                             AS last_updated
    FROM polls p
    JOIN users u ON p.creator_id = u.id
    LEFT JOIN (
        SELECT
            poll_id,
            COUNT(*)              AS total_votes,
            COUNT(DISTINCT user_id) AS unique_voters
        FROM votes
        WHERE poll_id = p_poll_id
        GROUP BY poll_id
    ) v ON v.poll_id = p.id
    WHERE p.id = p_poll_id
    ON CONFLICT (poll_id) DO UPDATE SET
        title              = EXCLUDED.title,
        creator_name       = EXCLUDED.creator_name,
        status             = EXCLUDED.status,
        total_votes        = EXCLUDED.total_votes,
        unique_voters      = EXCLUDED.unique_voters,
        participation_rate = EXCLUDED.participation_rate,
        last_updated       = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function 2: fn_refresh_option_breakdown
-- Replicates compute_option_breakdown() from transformers.py.
-- Called when a vote is inserted (affects one poll's options).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_option_breakdown(p_poll_id BIGINT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO analytics_option_breakdown (
        option_id,
        poll_id,
        option_text,
        vote_count,
        vote_percentage,
        last_updated
    )
    SELECT
        po.id                                         AS option_id,
        po.poll_id,
        po.option_text,
        COALESCE(vc.cnt, 0)                           AS vote_count,
        ROUND(
            COALESCE(vc.cnt, 0)::NUMERIC
            / GREATEST(COALESCE(pt.poll_total, 0), 1) * 100,
            2
        )                                             AS vote_percentage,
        NOW()                                         AS last_updated
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
        vote_count      = EXCLUDED.vote_count,
        vote_percentage = EXCLUDED.vote_percentage,
        last_updated    = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function 3: fn_refresh_votes_timeseries
-- Replicates the hourly bucket upsert from _handle_vote_event() in streaming.py.
-- Called when a vote is inserted; counts all votes for this poll in the same
-- hour bucket as the triggering vote.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_refresh_votes_timeseries(
    p_poll_id   BIGINT,
    p_vote_time TIMESTAMP
)
RETURNS VOID AS $$
DECLARE
    v_bucket TIMESTAMP;
    v_count  INT;
BEGIN
    -- COALESCE guards against a NULL created_at on the vote row
    v_bucket := date_trunc('hour', COALESCE(p_vote_time, NOW()));

    -- Use COALESCE on created_at so a NULL-timestamped vote is counted in its
    -- bucket (consistent with how the trigger buckets p_vote_time above).
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
        recorded_at     = EXCLUDED.recorded_at;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- Function 4: fn_refresh_user_participation
-- Replicates compute_user_participation() from transformers.py.
-- Called when a vote is inserted or a user is inserted.
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
        u.id                                    AS user_id,
        u.full_name                             AS user_name,
        COALESCE(va.total_votes_cast, 0)        AS total_votes_cast,
        COALESCE(va.polls_participated, 0)      AS polls_participated,
        COALESCE(pc.polls_created, 0)           AS polls_created,
        va.last_active,
        NOW()                                   AS last_updated
    FROM users u
    LEFT JOIN (
        SELECT
            user_id,
            COUNT(*)              AS total_votes_cast,
            COUNT(DISTINCT poll_id) AS polls_participated,
            MAX(created_at)       AS last_active
        FROM votes
        WHERE user_id = p_user_id
        GROUP BY user_id
    ) va ON va.user_id = u.id
    LEFT JOIN (
        SELECT COUNT(*) AS polls_created
        FROM polls
        WHERE creator_id = p_user_id
    ) pc ON TRUE
    WHERE u.id = p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        user_name          = EXCLUDED.user_name,
        total_votes_cast   = EXCLUDED.total_votes_cast,
        polls_participated = EXCLUDED.polls_participated,
        polls_created      = EXCLUDED.polls_created,
        last_active        = EXCLUDED.last_active,
        last_updated       = EXCLUDED.last_updated;
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
--            refresh the creator's participation stats (polls_created)
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
-- Trigger 3: After a poll is updated — refresh status (e.g., active → CLOSED)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_poll_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_poll_summary(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_poll_after_update ON polls;
CREATE TRIGGER trg_poll_after_update
    AFTER UPDATE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_poll_update();


-- ---------------------------------------------------------------------------
-- Trigger 4: After a user is inserted — initialize their participation row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_after_user_insert()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_refresh_user_participation(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_after_insert ON users;
CREATE TRIGGER trg_user_after_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trg_after_user_insert();


-- ---------------------------------------------------------------------------
-- Trigger 5: After a poll option is inserted — initialize its breakdown row
-- with zero votes. This ensures analytics_option_breakdown has rows for all
-- options even before any vote arrives (poll creation flow: polls → poll_options).
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
