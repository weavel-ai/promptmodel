"""ADD projectDailyRunLogMetric view

Revision ID: f4cbb53594f3
Revises: 73f8df3ae3ae
Create Date: 2024-01-08 16:58:24.268308

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f4cbb53594f3"
down_revision: Union[str, None] = "73f8df3ae3ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """create view
  public.project_daily_run_log_metric as
SELECT project_uuid,
  sum(cost::numeric) as total_cost,
  sum(latency) / count(*)::double precision / 1000::double precision as avg_latency,
  sum(total_tokens) as total_token_usage,
  count(*) as total_runs,
  date(created_at) as day,
  run_from_deployment
FROM run_log rl
GROUP BY run_from_deployment, (date(created_at)), project_uuid"""
    )


def downgrade() -> None:
    op.execute(
        """drop view
        public.project_daily_run_log_metric"""
    )
