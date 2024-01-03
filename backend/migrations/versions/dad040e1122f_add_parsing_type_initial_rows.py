"""add parsing_type initial rows

Revision ID: dad040e1122f
Revises: d15ae0363657
Create Date: 2024-01-03 20:17:11.962762

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dad040e1122f'
down_revision: Union[str, None] = 'd15ae0363657'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # upsert rows to parsing_type table
    # 1. type=colon 2. type=html 3. type=square_bracket 4. type=double_square_bracket
    
    op.execute(
        """
        INSERT INTO parsing_type (type) VALUES ('colon')
        ON CONFLICT (type) DO NOTHING
        """
    )
    
    op.execute(
        """
        INSERT INTO parsing_type (type) VALUES ('html')
        ON CONFLICT (type) DO NOTHING
        """
    )
    
    op.execute(
        """
        INSERT INTO parsing_type (type) VALUES ('square_bracket')
        ON CONFLICT (type) DO NOTHING
        """
    )
    
    op.execute(
        """
        INSERT INTO parsing_type (type) VALUES ('double_square_bracket')
        ON CONFLICT (type) DO NOTHING
        """
    )
    

    pass


def downgrade() -> None:
    pass
