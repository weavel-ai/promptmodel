"""Add score, eval metric tables

Revision ID: 67f6ff82e7bf
Revises: ddbc986e63e5
Create Date: 2023-12-19 15:48:22.330196

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67f6ff82e7bf'
down_revision: Union[str, None] = 'ddbc986e63e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop view dependent on run_log.score
    op.execute("drop view if exists deployment_run_log_view")
    # Drop column score from run_log
    op.drop_column('run_log', 'score')

    op.create_table(
        'eval_metric',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column(
            'created_at',
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'uuid',
            sa.UUID(),
            server_default=sa.text('gen_random_uuid()'),
            nullable=False,
        ),
        sa.Column(
            'project_uuid',
            sa.UUID(),
            sa.ForeignKey('project.uuid'),
            nullable=False,
        ),
        sa.Column(
            'function_model_uuid',
            sa.UUID(),
            sa.ForeignKey('function_model.uuid'),
            nullable=True,
        ),
        sa.Column(
            'chat_model_uuid',
            sa.UUID(),
            sa.ForeignKey('chat_model.uuid'),
            nullable=True,
        ),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('extent', sa.ARRAY(sa.Integer()), nullable=True),
        sa.PrimaryKeyConstraint('uuid'),
    )
    
    op.create_table(
        'score',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column(
            'created_at',
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'run_log_uuid',
            sa.UUID(),
            sa.ForeignKey('run_log.uuid'),
            nullable=True,
        ),
        sa.Column(
            'chat_session_uuid',
            sa.UUID(),
            sa.ForeignKey('chat_session.uuid'),
            nullable=True,
        ),
        sa.Column(
            'eval_metric_uuid',
            sa.UUID(),
            sa.ForeignKey('eval_metric.uuid'),
            nullable=False,
        ),
        sa.Column(
            'value',
            sa.Integer(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
    )

    # Recreate view deployment_run_log_view
    op.execute(
        """create view
  public.deployment_run_log_view as
select
  FM.project_uuid,
  FM.name as function_model_name,
  FM.uuid as function_model_uuid,
  FMV.version as function_model_version,
  FMV.uuid as function_model_version_uuid,
  rl.uuid as run_log_uuid,
  rl.created_at,
  rl.inputs,
  rl.raw_output,
  rl.parsed_outputs,
  rl.run_from_deployment,
  rl.prompt_tokens,
  rl.completion_tokens,
  rl.total_tokens,
  rl.latency,
  rl.cost,
  rl.run_log_metadata,
  rl.function_call,
  rl.tool_calls
from
  run_log rl
  left join function_model_version FMV on FMV.uuid = rl.version_uuid
  left join function_model FM on FM.uuid = FMV.function_model_uuid
order by
  rl.created_at desc;"""
    )


def downgrade() -> None:
    pass
