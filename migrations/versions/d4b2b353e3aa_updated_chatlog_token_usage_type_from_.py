"""Updated ChatLog token_usage type from json to bigint

Revision ID: d4b2b353e3aa
Revises: cbf7b3a6ba3c
Create Date: 2023-12-09 23:03:38.727641

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4b2b353e3aa"
down_revision: Union[str, None] = "cbf7b3a6ba3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the dependent view
    op.execute("DROP VIEW IF EXISTS chat_logs_count")
    op.execute("DROP VIEW IF EXISTS chat_log_view")
    op.execute("DROP VIEW IF EXISTS daily_chat_log_metric")

    # Alter the column type
    op.execute(
        """
        ALTER TABLE chat_log
        ALTER COLUMN token_usage
        TYPE bigint
        USING token_usage::text::bigint
        """
    )

    # Recreate the view (with the correct definition that works with the new column type)
    op.execute(
        """
        create view
        public.chat_log_view as
        with
        numberedmessages as (
            select
            chat_log.id,
            chat_log.created_at,
            chat_log.session_uuid,
            chat_log.role,
            chat_log.content,
            chat_log.tool_calls,
            chat_log.latency,
            chat_log.cost,
            chat_log.token_usage,
            row_number() over (
                partition by
                chat_log.session_uuid
                order by
                chat_log.created_at
            ) as msg_seq_num
            from
            chat_log
        )
        select
        cm.project_uuid,
        cm.name as chat_model_name,
        cm.uuid as chat_model_uuid,
        cv.uuid as chat_model_version_uuid,
        cv.version as chat_model_version,
        user_msg.created_at,
        user_msg.session_uuid,
        assistant_msg.id as assistant_log_id,
        user_msg.content as user_input,
        assistant_msg.content as assistant_output,
        user_msg.tool_calls,
        user_msg.latency,
        user_msg.cost,
        user_msg.token_usage,
        session.run_from_deployment
        from
        numberedmessages user_msg
        join numberedmessages assistant_msg on user_msg.session_uuid = assistant_msg.session_uuid
        and assistant_msg.msg_seq_num = (user_msg.msg_seq_num + 1)
        join chat_log_session session on user_msg.session_uuid = session.uuid
        join chat_model_version cv on session.version_uuid = cv.uuid
        join chat_model cm on cv.chat_model_uuid = cm.uuid
        where
        user_msg.role = 'user'::text
        and assistant_msg.role = 'assistant'::text
        order by
        user_msg.msg_seq_num;
        """
    )
    op.execute(
        """
        create view
        public.chat_logs_count as
        select
        p.uuid as project_uuid,
        count(cl.project_uuid) as chat_logs_count
        from
        project p
        left join chat_log_view cl on p.uuid = cl.project_uuid
        group by
        p.uuid;
        """
    )
    op.execute(
        """
        CREATE VIEW public.daily_chat_log_metric AS
        SELECT
        p.name AS project_name,
        cm.name AS chat_model_name,
        cm.uuid AS chat_model_uuid,
        DATE(cs.created_at) AS day,
        SUM(cl.cost::NUMERIC) AS total_cost,
        SUM(cl.latency) / COUNT(cl.*)::DOUBLE PRECISION / 1000::DOUBLE PRECISION AS avg_latency,
        JSONB_BUILD_OBJECT(
            'total_tokens', COALESCE(SUM(cl.token_usage), 0::NUMERIC),
            'total_prompt_tokens', COALESCE(SUM(CASE WHEN cl.role = 'user' THEN cl.token_usage ELSE 0 END), 0::NUMERIC),
            'total_output_tokens', COALESCE(SUM(CASE WHEN cl.role = 'assistant' THEN cl.token_usage ELSE 0 END), 0::NUMERIC)
        ) AS total_token_usage,
        COUNT(cs.*) AS total_chat_sessions
        FROM
        project p
        LEFT JOIN chat_model cm ON cm.project_uuid = p.uuid
        LEFT JOIN chat_model_version v ON v.chat_model_uuid = cm.uuid
        LEFT JOIN chat_log_session cs ON cs.version_uuid = v.uuid
        LEFT JOIN chat_log cl ON cl.session_uuid = cs.uuid
        GROUP BY
        p.name,
        cm.name,
        cm.uuid,
        DATE(cs.created_at)
        ORDER BY
        DATE(cs.created_at),
        p.name;
    """
    )


def downgrade() -> None:
    pass
