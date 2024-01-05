"""add_created_at_in_dataset

Revision ID: 73f8df3ae3ae
Revises: bbee0c86b6c6
Create Date: 2024-01-04 17:50:55.321879

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73f8df3ae3ae'
down_revision: Union[str, None] = 'bbee0c86b6c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('dataset', sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False))
    
    op.alter_column('run_log', 'project_uuid',
               existing_type=sa.UUID(),
               nullable=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###

    op.alter_column('run_log', 'project_uuid',
               existing_type=sa.UUID(),
               nullable=True)
    
    op.drop_column('dataset', 'created_at')
    # ### end Alembic commands ###
