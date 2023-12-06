from typing import Optional, List, Dict, Any, Union, Tuple, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    String,
    TIMESTAMP,
    Boolean,
    Text,
    JSON,
    Float,
    BigInteger,
    ARRAY,
    Identity,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4, UUID as UUIDType
from sqlalchemy.sql import func, text
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from .chat_model import ChatModel
    from .prompt_model import PromptModel
    from .function_schema import FunctionSchema
    from .sample_input import SampleInput


class Organization(SQLModel, table=True):
    __tablename__ = "organization"

    id: int = Field(sa_column=Column(BigInteger, Identity(), primary_key=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )

    organization_id: int = Field(sa_column=Column(Text, unique=True))
    name: str = Field(sa_column=Column(Text, nullable=False))
    slug: str = Field(sa_column=Column(Text, nullable=False))

    projects: List["Project"] = Relationship(back_populates="organization")


class User(SQLModel, table=True):
    __tablename__ = "user"

    id: int = Field(sa_column=Column(BigInteger, Identity()))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    user_id: str = Field(sa_column=Column(Text, primary_key=True, unique=True))

    email: int = Field(sa_column=Column(Text, nullable=False))
    is_test: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))

    cli_access: "CliAccess" = Relationship(back_populates="user")


class CliAccess(SQLModel, table=True):
    __tablename__ = "cli_access"

    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    # created_at + 7 days
    expires_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True),
            server_default=text("CURRENT_TIMESTAMP + INTERVAL '7 days'"),
        )
    )
    user_id: int = Field(
        sa_column=Column(Text, ForeignKey("user.user_id"), primary_key=True)
    )

    api_key: str = Field(sa_column=Column(Text, unique=True))

    user: "User" = Relationship(back_populates="cli_access")


class Project(SQLModel, table=True):
    __tablename__ = "project"

    id: int = Field(sa_column=Column(BigInteger, Identity(), unique=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            server_default=text("gen_random_uuid()"),
            primary_key=True,
            unique=True,
        )
    )

    name: str = Field(sa_column=Column(Text, nullable=False))
    api_key: str = Field(sa_column=Column(Text, nullable=False, unique=True))
    version: int = Field(sa_column=Column(BigInteger, nullable=False, default=1))
    online: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))

    description: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    cli_access_key: Optional[str] = Field(
        sa_column=Column(
            Text,
            ForeignKey("cli_access.api_key", onupdate="CASCADE", ondelete="SET NULL"),
            nullable=True,
        )
    )

    organization_id: str = Field(
        sa_column=Column(
            Text,
            ForeignKey(
                "organization.organization_id", onupdate="CASCADE", ondelete="CASCADE"
            ),
            nullable=True,
        )
    )

    organization: "Organization" = Relationship(back_populates="projects")
    tags: List["Tag"] = Relationship(back_populates="project")
    llms: List["LLM"] = Relationship(back_populates="project")
    project_changelogs: List["ProjectChangelog"] = Relationship(
        back_populates="project"
    )
    prompt_models: List["PromptModel"] = Relationship(back_populates="project")
    chat_models: List["ChatModel"] = Relationship(back_populates="project")
    function_schemas: List["FunctionSchema"] = Relationship(back_populates="project")
    sample_inputs: List["SampleInput"] = Relationship(back_populates="project")


class ProjectChangelog(SQLModel, table=True):
    __tablename__ = "project_changelog"

    id: int = Field(sa_column=Column(BigInteger, Identity(), primary_key=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )

    logs: List[Dict[str, Any]] = Field(
        sa_column=Column(ARRAY(JSONB), nullable=False, server_default="[]")
    )

    project_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), ForeignKey("project.uuid"), nullable=True)
    )

    project: "Project" = Relationship(back_populates="project_changelogs")


class UsersOrganizations(SQLModel, table=True):
    __tablename__ = "users_organizations"

    id: int = Field(sa_column=Column(BigInteger, Identity(), unique=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )

    user_id: str = Field(
        sa_column=Column(Text, ForeignKey("user.user_id"), primary_key=True)
    )
    organization_id: str = Field(
        sa_column=Column(
            Text, ForeignKey("organization.organization_id"), primary_key=True
        )
    )

    user: "User" = Relationship()
    organization: "Organization" = Relationship()


class Tag(SQLModel, table=True):
    __tablename__ = "tag"

    id: int = Field(sa_column=Column(BigInteger, Identity(), primary_key=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )

    name: str = Field(sa_column=Column(Text))
    color: str = Field(sa_column=Column(Text))

    project_uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("project.uuid", onupdate="CASCADE", ondelete="CASCADE"),
            nullable=True,
        )
    )

    project: "Project" = Relationship(back_populates="tags")


class LLM(SQLModel, table=True):
    __tablename__ = "llm"

    id: int = Field(sa_column=Column(BigInteger, Identity(), primary_key=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )

    name: str = Field(sa_column=Column(Text))
    api_base: str = Field(sa_column=Column(Text))

    project_uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("project.uuid", onupdate="CASCADE", ondelete="CASCADE"),
            nullable=True,
        )
    )

    project: "Project" = Relationship(back_populates="llms")
