"""delete unique constriant in primary keys

Revision ID: d15ae0363657
Revises: d18e0a779d2a
Create Date: 2024-01-03 15:37:51.071786

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd15ae0363657'
down_revision: Union[str, None] = 'd18e0a779d2a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('dataset',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('uuid', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('project_uuid', sa.UUID(), nullable=True),
    sa.Column('eval_metric_uuid', sa.UUID(), nullable=True),
    sa.Column('function_model_uuid', sa.UUID(), nullable=True),
    sa.ForeignKeyConstraint(['eval_metric_uuid'], ['eval_metric.uuid'], onupdate='CASCADE', ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['function_model_uuid'], ['function_model.uuid'], onupdate='CASCADE', ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['project_uuid'], ['project.uuid'], onupdate='CASCADE', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('id')
    )
    op.create_table('batch_run',
    sa.Column('id', sa.BigInteger(), sa.Identity(always=False), nullable=False),
    sa.Column('uuid', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('dataset_uuid', sa.UUID(), nullable=True),
    sa.Column('function_model_version_uuid', sa.UUID(), nullable=True),
    sa.Column('score', sa.Float(), nullable=True),
    sa.Column('status', sa.Text(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('finished_at', sa.TIMESTAMP(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['dataset_uuid'], ['dataset.uuid'], onupdate='CASCADE', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['function_model_version_uuid'], ['function_model_version.uuid'], onupdate='CASCADE', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('uuid'),
    sa.UniqueConstraint('id')
    )
    op.create_table('dataset_sample_input',
    sa.Column('dataset_uuid', sa.UUID(), nullable=False),
    sa.Column('sample_input_uuid', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['dataset_uuid'], ['dataset.uuid'], onupdate='CASCADE', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sample_input_uuid'], ['sample_input.uuid'], onupdate='CASCADE', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('dataset_uuid', 'sample_input_uuid')
    )
    op.drop_constraint('chat_log_uuid_key', 'chat_log', type_='unique')
    op.drop_constraint('chat_message_uuid_key', 'chat_message', type_='unique')
    
    op.drop_constraint('chat_model_version_chat_model_uuid_fkey', 'chat_model_version', type_='foreignkey')
    op.drop_constraint('eval_metric_chat_model_uuid_fkey', 'eval_metric', type_='foreignkey')
    op.drop_constraint('chat_model_uuid_key', 'chat_model', type_='unique') # TO DO THIS
    op.create_foreign_key(None, 'chat_model_version', 'chat_model', ['chat_model_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'eval_metric', 'chat_model', ['chat_model_uuid'], ['uuid'], onupdate='CASCADE', ondelete='SET NULL')
    
    op.drop_constraint('chat_session_version_uuid_fkey', 'chat_session', type_='foreignkey')
    op.drop_constraint('chat_model_version_uuid_key', 'chat_model_version', type_='unique') # TO DO THIS
    op.create_foreign_key(None, 'chat_session', 'chat_model_version', ['version_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    
    op.drop_constraint('chat_session_uuid_key', 'chat_session', type_='unique')
    op.create_foreign_key(None, 'cli_access', 'user', ['user_id'], ['user_id'], onupdate='CASCADE', ondelete='CASCADE')
    op.drop_constraint('eval_metric_uuid_key', 'eval_metric', type_='unique')
    op.drop_constraint('function_model_uuid_key', 'function_model', type_='unique')
    op.drop_constraint('function_model_version_uuid_key', 'function_model_version', type_='unique')
    
    op.drop_constraint('tag_project_uuid_fkey', 'tag', type_='foreignkey')
    op.drop_constraint('chat_log_project_uuid_fkey', 'chat_log', type_='foreignkey')
    op.drop_constraint('chat_model_project_uuid_fkey', 'chat_model', type_='foreignkey')
    op.drop_constraint('eval_metric_project_uuid_fkey', 'eval_metric', type_='foreignkey')
    op.drop_constraint('function_model_project_uuid_fkey', 'function_model', type_='foreignkey')
    op.drop_constraint('function_schema_project_uuid_fkey', 'function_schema', type_='foreignkey')
    op.drop_constraint('project_changelog_project_uuid_fkey', 'project_changelog', type_='foreignkey')
    op.drop_constraint('run_log_project_uuid_fkey', 'run_log', type_='foreignkey')
    op.drop_constraint('sample_input_project_uuid_fkey', 'sample_input', type_='foreignkey')
    op.drop_constraint('dataset_project_uuid_fkey', 'dataset', type_='foreignkey')
    op.drop_constraint('llm_project_uuid_fkey', 'llm', type_='foreignkey')
    op.drop_constraint('project_uuid_key', 'project', type_='unique') # TO DO THIS
    op.create_foreign_key(None, 'tag', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'chat_log', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'chat_model', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'eval_metric', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'function_model', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'function_schema', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'project_changelog', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'run_log', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'sample_input', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'dataset', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    op.create_foreign_key(None, 'llm', 'project', ['project_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    
    op.add_column('run_log', sa.Column('sample_input_uuid', sa.UUID(), nullable=True))
    op.add_column('run_log', sa.Column('batch_run_uuid', sa.UUID(), nullable=True))
    
    op.drop_constraint('run_log_score_run_log_uuid_fkey', 'run_log_score', type_='foreignkey')
    op.drop_constraint('run_log_uuid_key', 'run_log', type_='unique') # TO DO THIS
    op.create_foreign_key(None, 'run_log_score', 'run_log', ['run_log_uuid'], ['uuid'], onupdate='CASCADE', ondelete='CASCADE')
    
    op.create_foreign_key(None, 'run_log', 'batch_run', ['batch_run_uuid'], ['uuid'], onupdate='CASCADE', ondelete='SET NULL')
    op.create_foreign_key(None, 'run_log', 'sample_input', ['sample_input_uuid'], ['uuid'], onupdate='CASCADE', ondelete='SET NULL')
    op.drop_column('run_log', 'input_register_name')
    op.add_column('sample_input', sa.Column('ground_truth', sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('sample_input', 'ground_truth')
    op.add_column('run_log', sa.Column('input_register_name', sa.TEXT(), autoincrement=False, nullable=True))
    op.drop_constraint('run_log_sample_input_uuid_fkey', 'run_log', type_='foreignkey')
    op.drop_constraint('run_log_batch_run_uuid_fkey', 'run_log', type_='foreignkey')
    op.create_unique_constraint('run_log_uuid_key', 'run_log', ['uuid'])
    op.drop_column('run_log', 'batch_run_uuid')
    op.drop_column('run_log', 'sample_input_uuid')
    op.create_unique_constraint('project_uuid_key', 'project', ['uuid'])
    op.create_unique_constraint('function_model_version_uuid_key', 'function_model_version', ['uuid'])
    op.create_unique_constraint('function_model_uuid_key', 'function_model', ['uuid'])
    op.create_unique_constraint('eval_metric_uuid_key', 'eval_metric', ['uuid'])
    op.drop_constraint('cli_access_user_id_fkey', 'cli_access', type_='foreignkey')
    op.create_unique_constraint('chat_session_uuid_key', 'chat_session', ['uuid'])
    op.create_unique_constraint('chat_model_version_uuid_key', 'chat_model_version', ['uuid'])
    op.create_unique_constraint('chat_model_uuid_key', 'chat_model', ['uuid'])
    op.create_unique_constraint('chat_message_uuid_key', 'chat_message', ['uuid'])
    op.create_unique_constraint('chat_log_uuid_key', 'chat_log', ['uuid'])
    op.drop_table('dataset_sample_input')
    op.drop_table('batch_run')
    op.drop_table('dataset')
    # ### end Alembic commands ###
