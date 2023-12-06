"""init

Revision ID: b2438abfa54b
Revises: 
Create Date: 2023-12-05 12:11:20.247933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b2438abfa54b"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "chat_log",
        sa.Column(
            "chat_log_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )
    op.alter_column("chat_log", "session_uuid", existing_type=sa.UUID(), nullable=False)
    op.drop_constraint("chat_log_session_uuid_fkey", "chat_log", type_="foreignkey")
    op.create_foreign_key(
        None, "chat_log", "chat_log_session", ["session_uuid"], ["uuid"]
    )
    op.drop_column("chat_log", "metadata")
    op.add_column(
        "chat_log_session",
        sa.Column(
            "session_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )
    op.alter_column(
        "chat_log_session",
        "run_from_deployment",
        existing_type=sa.BOOLEAN(),
        nullable=False,
    )
    op.alter_column(
        "chat_log_session", "version_uuid", existing_type=sa.UUID(), nullable=False
    )
    op.drop_constraint(
        "chat_log_session_version_uuid_fkey", "chat_log_session", type_="foreignkey"
    )
    op.create_foreign_key(
        None, "chat_log_session", "chat_model_version", ["version_uuid"], ["uuid"]
    )
    op.drop_column("chat_log_session", "metadata")
    op.alter_column("chat_model", "name", existing_type=sa.TEXT(), nullable=False)
    op.alter_column(
        "chat_model", "project_uuid", existing_type=sa.UUID(), nullable=False
    )
    op.drop_constraint("chat_model_project_uuid_fkey", "chat_model", type_="foreignkey")
    op.create_foreign_key(None, "chat_model", "project", ["project_uuid"], ["uuid"])
    op.alter_column(
        "chat_model_version", "version", existing_type=sa.BIGINT(), nullable=False
    )
    op.alter_column(
        "chat_model_version", "model", existing_type=sa.TEXT(), nullable=False
    )
    op.alter_column(
        "chat_model_version", "system_prompt", existing_type=sa.TEXT(), nullable=False
    )
    op.alter_column(
        "chat_model_version",
        "is_published",
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text("false"),
    )
    op.alter_column(
        "chat_model_version", "chat_model_uuid", existing_type=sa.UUID(), nullable=False
    )
    op.drop_constraint(
        "chat_model_version_chat_model_uuid_fkey",
        "chat_model_version",
        type_="foreignkey",
    )
    op.create_foreign_key(
        None, "chat_model_version", "chat_model", ["chat_model_uuid"], ["uuid"]
    )
    op.create_foreign_key(None, "cli_access", "user", ["user_id"], ["user_id"])
    op.alter_column(
        "function_schema",
        "uuid",
        existing_type=sa.UUID(),
        nullable=True,
        existing_server_default=sa.text("gen_random_uuid()"),
    )
    op.alter_column(
        "function_schema", "project_uuid", existing_type=sa.UUID(), nullable=False
    )
    op.alter_column("organization", "name", existing_type=sa.TEXT(), nullable=False)
    op.alter_column("organization", "slug", existing_type=sa.TEXT(), nullable=False)
    op.alter_column("project", "name", existing_type=sa.TEXT(), nullable=False)
    op.drop_column("project", "sync")
    op.drop_constraint(
        "project_changelog_project_uuid_fkey", "project_changelog", type_="foreignkey"
    )
    op.create_foreign_key(
        None, "project_changelog", "project", ["project_uuid"], ["uuid"]
    )
    op.alter_column("prompt", "version_uuid", existing_type=sa.UUID(), nullable=False)
    op.drop_constraint("prompt_version_uuid_fkey", "prompt", type_="foreignkey")
    op.create_foreign_key(
        None, "prompt", "prompt_model_version", ["version_uuid"], ["uuid"]
    )
    op.alter_column(
        "prompt_model", "project_uuid", existing_type=sa.UUID(), nullable=False
    )
    op.drop_constraint(
        "prompt_model_project_uuid_fkey", "prompt_model", type_="foreignkey"
    )
    op.create_foreign_key(None, "prompt_model", "project", ["project_uuid"], ["uuid"])
    op.alter_column(
        "prompt_model_version",
        "functions",
        existing_type=postgresql.ARRAY(sa.TEXT()),
        nullable=True,
        existing_server_default=sa.text("'{}'::text[]"),
    )
    op.alter_column(
        "prompt_model_version",
        "prompt_model_uuid",
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.drop_constraint(
        "prompt_model_version_prompt_model_uuid_fkey",
        "prompt_model_version",
        type_="foreignkey",
    )
    op.drop_constraint(
        "prompt_model_version_parsing_type_fkey",
        "prompt_model_version",
        type_="foreignkey",
    )
    op.create_foreign_key(
        None, "prompt_model_version", "prompt_model", ["prompt_model_uuid"], ["uuid"]
    )
    op.create_foreign_key(
        None,
        "prompt_model_version",
        "parsing_type",
        ["parsing_type"],
        ["type"],
        onupdate="CASCADE",
        ondelete="SET NULL",
    )
    op.add_column(
        "run_log",
        sa.Column(
            "run_log_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )
    op.alter_column("run_log", "version_uuid", existing_type=sa.UUID(), nullable=False)
    op.drop_constraint("run_log_version_uuid_fkey", "run_log", type_="foreignkey")
    op.create_foreign_key(
        None, "run_log", "prompt_model_version", ["version_uuid"], ["uuid"]
    )
    op.drop_column("run_log", "metadata")
    op.alter_column(
        "sample_input",
        "uuid",
        existing_type=sa.UUID(),
        nullable=True,
        existing_server_default=sa.text("gen_random_uuid()"),
    )
    op.alter_column(
        "sample_input", "project_uuid", existing_type=sa.UUID(), nullable=False
    )
    op.drop_constraint(
        "sample_input_project_uuid_fkey", "sample_input", type_="foreignkey"
    )
    op.create_foreign_key(None, "sample_input", "project", ["project_uuid"], ["uuid"])
    op.alter_column("user", "email", existing_type=sa.TEXT(), nullable=False)
    op.alter_column(
        "user",
        "is_test",
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text("false"),
    )
    op.drop_constraint("user_id_key", "user", type_="unique")
    op.create_unique_constraint(None, "user", ["user_id"])
    op.drop_constraint(
        "users_organizations_user_id_fkey", "users_organizations", type_="foreignkey"
    )
    op.drop_constraint(
        "users_organizations_organization_id_fkey",
        "users_organizations",
        type_="foreignkey",
    )
    op.create_foreign_key(None, "users_organizations", "user", ["user_id"], ["user_id"])
    op.create_foreign_key(
        None,
        "users_organizations",
        "organization",
        ["organization_id"],
        ["organization_id"],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, "users_organizations", type_="foreignkey")
    op.drop_constraint(None, "users_organizations", type_="foreignkey")
    op.create_foreign_key(
        "users_organizations_organization_id_fkey",
        "users_organizations",
        "organization",
        ["organization_id"],
        ["organization_id"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "users_organizations_user_id_fkey",
        "users_organizations",
        "user",
        ["user_id"],
        ["user_id"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.drop_constraint(None, "user", type_="unique")
    op.create_unique_constraint("user_id_key", "user", ["id"])
    op.alter_column(
        "user",
        "is_test",
        existing_type=sa.BOOLEAN(),
        nullable=True,
        existing_server_default=sa.text("false"),
    )
    op.alter_column("user", "email", existing_type=sa.TEXT(), nullable=True)
    op.drop_constraint(None, "sample_input", type_="foreignkey")
    op.create_foreign_key(
        "sample_input_project_uuid_fkey",
        "sample_input",
        "project",
        ["project_uuid"],
        ["uuid"],
        onupdate="CASCADE",
    )
    op.alter_column(
        "sample_input", "project_uuid", existing_type=sa.UUID(), nullable=True
    )
    op.alter_column(
        "sample_input",
        "uuid",
        existing_type=sa.UUID(),
        nullable=False,
        existing_server_default=sa.text("gen_random_uuid()"),
    )
    op.add_column(
        "run_log",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.drop_constraint(None, "run_log", type_="foreignkey")
    op.create_foreign_key(
        "run_log_version_uuid_fkey",
        "run_log",
        "prompt_model_version",
        ["version_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column("run_log", "version_uuid", existing_type=sa.UUID(), nullable=True)
    op.drop_column("run_log", "run_log_metadata")
    op.drop_constraint(None, "prompt_model_version", type_="foreignkey")
    op.drop_constraint(None, "prompt_model_version", type_="foreignkey")
    op.create_foreign_key(
        "prompt_model_version_parsing_type_fkey",
        "prompt_model_version",
        "parsing_type",
        ["parsing_type"],
        ["type"],
    )
    op.create_foreign_key(
        "prompt_model_version_prompt_model_uuid_fkey",
        "prompt_model_version",
        "prompt_model",
        ["prompt_model_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column(
        "prompt_model_version",
        "prompt_model_uuid",
        existing_type=sa.UUID(),
        nullable=True,
    )
    op.alter_column(
        "prompt_model_version",
        "functions",
        existing_type=postgresql.ARRAY(sa.TEXT()),
        nullable=False,
        existing_server_default=sa.text("'{}'::text[]"),
    )
    op.drop_constraint(None, "prompt_model", type_="foreignkey")
    op.create_foreign_key(
        "prompt_model_project_uuid_fkey",
        "prompt_model",
        "project",
        ["project_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column(
        "prompt_model", "project_uuid", existing_type=sa.UUID(), nullable=True
    )
    op.drop_constraint(None, "prompt", type_="foreignkey")
    op.create_foreign_key(
        "prompt_version_uuid_fkey",
        "prompt",
        "prompt_model_version",
        ["version_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column("prompt", "version_uuid", existing_type=sa.UUID(), nullable=True)
    op.drop_constraint(None, "project_changelog", type_="foreignkey")
    op.create_foreign_key(
        "project_changelog_project_uuid_fkey",
        "project_changelog",
        "project",
        ["project_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.add_column(
        "project",
        sa.Column(
            "sync",
            sa.BOOLEAN(),
            server_default=sa.text("false"),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.alter_column("project", "name", existing_type=sa.TEXT(), nullable=True)
    op.alter_column("organization", "slug", existing_type=sa.TEXT(), nullable=True)
    op.alter_column("organization", "name", existing_type=sa.TEXT(), nullable=True)
    op.alter_column(
        "function_schema", "project_uuid", existing_type=sa.UUID(), nullable=True
    )
    op.alter_column(
        "function_schema",
        "uuid",
        existing_type=sa.UUID(),
        nullable=False,
        existing_server_default=sa.text("gen_random_uuid()"),
    )
    op.drop_constraint(None, "cli_access", type_="foreignkey")
    op.drop_constraint(None, "chat_model_version", type_="foreignkey")
    op.create_foreign_key(
        "chat_model_version_chat_model_uuid_fkey",
        "chat_model_version",
        "chat_model",
        ["chat_model_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column(
        "chat_model_version", "chat_model_uuid", existing_type=sa.UUID(), nullable=True
    )
    op.alter_column(
        "chat_model_version",
        "is_published",
        existing_type=sa.BOOLEAN(),
        nullable=True,
        existing_server_default=sa.text("false"),
    )
    op.alter_column(
        "chat_model_version", "system_prompt", existing_type=sa.TEXT(), nullable=True
    )
    op.alter_column(
        "chat_model_version", "model", existing_type=sa.TEXT(), nullable=True
    )
    op.alter_column(
        "chat_model_version", "version", existing_type=sa.BIGINT(), nullable=True
    )
    op.drop_constraint(None, "chat_model", type_="foreignkey")
    op.create_foreign_key(
        "chat_model_project_uuid_fkey",
        "chat_model",
        "project",
        ["project_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column(
        "chat_model", "project_uuid", existing_type=sa.UUID(), nullable=True
    )
    op.alter_column("chat_model", "name", existing_type=sa.TEXT(), nullable=True)
    op.add_column(
        "chat_log_session",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.drop_constraint(None, "chat_log_session", type_="foreignkey")
    op.create_foreign_key(
        "chat_log_session_version_uuid_fkey",
        "chat_log_session",
        "chat_model_version",
        ["version_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="SET NULL",
    )
    op.alter_column(
        "chat_log_session", "version_uuid", existing_type=sa.UUID(), nullable=True
    )
    op.alter_column(
        "chat_log_session",
        "run_from_deployment",
        existing_type=sa.BOOLEAN(),
        nullable=True,
    )
    op.drop_column("chat_log_session", "session_metadata")
    op.add_column(
        "chat_log",
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            autoincrement=False,
            nullable=True,
        ),
    )
    op.drop_constraint(None, "chat_log", type_="foreignkey")
    op.create_foreign_key(
        "chat_log_session_uuid_fkey",
        "chat_log",
        "chat_log_session",
        ["session_uuid"],
        ["uuid"],
        onupdate="CASCADE",
        ondelete="CASCADE",
    )
    op.alter_column("chat_log", "session_uuid", existing_type=sa.UUID(), nullable=True)
    op.drop_column("chat_log", "chat_log_metadata")
    # ### end Alembic commands ###
