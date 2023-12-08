"""Added password & name to user table

Revision ID: cbf7b3a6ba3c
Revises: 08d147ded884
Create Date: 2023-12-08 14:27:27.594753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cbf7b3a6ba3c"
down_revision: Union[str, None] = "08d147ded884"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user", sa.Column("hashed_password", sa.Text(), nullable=True))
    op.add_column("user", sa.Column("first_name", sa.Text(), nullable=True))
    op.add_column("user", sa.Column("last_name", sa.Text(), nullable=True))


def downgrade() -> None:
    pass
