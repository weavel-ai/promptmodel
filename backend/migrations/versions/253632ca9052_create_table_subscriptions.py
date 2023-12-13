"""Create table subscriptions

Revision ID: 253632ca9052
Revises: 0df20fadc31c
Create Date: 2023-12-12 10:09:42.052431

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '253632ca9052'
down_revision: Union[str, None] = '0df20fadc31c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
    CREATE OR REPLACE FUNCTION notify_redis_on_change()
    RETURNS trigger AS $$
    DECLARE
        channel_name text;
    BEGIN
        channel_name := TG_TABLE_NAME || '_channel';
        PERFORM pg_notify(channel_name, row_to_json(NEW)::text);
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    trigger_template = """
    CREATE TRIGGER {table_name}_update_trigger
    AFTER INSERT OR UPDATE ON {table_name}
    FOR EACH ROW EXECUTE FUNCTION notify_redis_on_change();
    """
    tables = ["project", "function_model", "chat_model", "sample_input", "function_schema", "chat_log", "run_log"]
    for table in tables:
        op.execute(trigger_template.format(table_name=table))


def downgrade() -> None:
    pass
