"""Add image_url to user table

Revision ID: be97f2f2a373
Revises: dfcc59a1a1bd
Create Date: 2024-01-18 17:18:14.707133

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be97f2f2a373'
down_revision: Union[str, None] = 'dfcc59a1a1bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('user', sa.Column('image_url', sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('user', 'image_url')
    # ### end Alembic commands ###