"""user subscription fields

Revision ID: 0010_user_subscription_fields
Revises: 0009_ai_chat_sessions
Create Date: 2024-03-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0010_user_subscription_fields'
down_revision: Union[str, None] = '0009_ai_chat_sessions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns
    op.add_column('users', sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('subscription_status', sa.String(length=20), server_default='trialing', nullable=False))
    op.add_column('users', sa.Column('plan_tier', sa.String(length=20), server_default='free_trial', nullable=False))
    op.add_column('users', sa.Column('ai_chat_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('ai_chat_count_reset_at', sa.DateTime(timezone=True), nullable=True))

    # Update existing users to not be locked out
    op.execute("UPDATE users SET subscription_status='active', plan_tier='starter'")


def downgrade() -> None:
    op.drop_column('users', 'ai_chat_count_reset_at')
    op.drop_column('users', 'ai_chat_count')
    op.drop_column('users', 'plan_tier')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'trial_ends_at')
