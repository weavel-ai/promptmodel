"""Update sample_input table

Revision ID: ddbc986e63e5
Revises: 253632ca9052
Create Date: 2023-12-18 14:28:26.050133

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ddbc986e63e5'
down_revision: Union[str, None] = '253632ca9052'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'sample_input',
        sa.Column(
            'function_model_uuid',
            sa.UUID(),
            sa.ForeignKey( 
                'function_model.uuid', ondelete='SET NULL'
            ),
            nullable=True,
        ),
    )
    op.add_column(
        'sample_input',
        sa.Column('input_keys', sa.ARRAY(sa.Text()), nullable=True),
    )


def downgrade() -> None:
    pass
