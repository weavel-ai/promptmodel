"""Removed id column from ParsingType

Revision ID: b0287d5e6535
Revises: d4b2b353e3aa
Create Date: 2023-12-09 23:42:07.696967

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b0287d5e6535"
down_revision: Union[str, None] = "d4b2b353e3aa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("parsing_type", "id")


def downgrade() -> None:
    pass
