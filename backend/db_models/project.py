from typing import Optional, List, Dict, Any, Union, Tuple, TYPE_CHECKING
from datetime import datetime
from uuid import uuid4, UUID as UUIDType
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
from sqlalchemy.sql import func, text
from base.database import Base
from passlib.context import CryptContext

if TYPE_CHECKING:
    from .chat_model import ChatModel
    from .function_model import FunctionModel
    from .function_schema import FunctionSchema
    from .sample_input import SampleInput

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class Organization(Base):
    __tablename__ = "organization"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    organization_id: str = Column(Text, unique=True)
    name: str = Column(Text, nullable=False)
    slug: str = Column(Text, nullable=False)

    # projects: List["Project"] = Relationship(back_populates="organization")


class User(Base):
    __tablename__ = "user"

    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    user_id: str = Column(Text, primary_key=True, unique=True)

    email: int = Column(Text, nullable=False)
    hashed_password: str = Column(Text, nullable=True)
    first_name: str = Column(Text, nullable=True)
    last_name: str = Column(Text, nullable=True)
    is_test: bool = Column(Boolean, nullable=False, default=False)

    # cli_access: "CliAccess" = Relationship(back_populates="user"
    def verify_password(self, password):
        return pwd_context.verify(password, self.hashed_password)


class CliAccess(Base):
    __tablename__ = "cli_access"

    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    # created_at + 7 days
    expires_at: datetime = Column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP + INTERVAL '7 days'"),
    )

    user_id: str = Column(
        Text,
        ForeignKey(
            "user.user_id",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    api_key: str = Column(Text, unique=True)

    # user: "User" = Relationship(back_populates="cli_access")


class Project(Base):
    __tablename__ = "project"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        server_default=text("gen_random_uuid()"),
        primary_key=True,
        unique=True,
    )

    name: str = Column(Text, nullable=False)
    api_key: str = Column(Text, nullable=False, unique=True)
    version: int = Column(BigInteger, nullable=False, default=1)
    online: bool = Column(Boolean, nullable=False, default=False)

    description: Optional[str] = Column(Text, nullable=True)
    cli_access_key: Optional[str] = Column(
        Text,
        ForeignKey("cli_access.api_key", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )

    organization_id: str = Column(
        Text,
        ForeignKey(
            "organization.organization_id", onupdate="CASCADE", ondelete="CASCADE"
        ),
        nullable=True,
    )


class ProjectChangelog(Base):
    __tablename__ = "project_changelog"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    logs: List[Dict[str, Any]] = Column(
        ARRAY(JSONB), nullable=False, server_default=text("'{}'::jsonb[]")
    )

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "project.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # project: "Project" = Relationship(back_populates="project_changelogs")


class UsersOrganizations(Base):
    __tablename__ = "users_organizations"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    user_id: str = Column(
        Text,
        ForeignKey(
            "user.user_id",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    organization_id: str = Column(
        Text,
        ForeignKey(
            "organization.organization_id",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )

    # user: "User" = Relationship()
    # organization: "Organization" = Relationship()


class Tag(Base):
    __tablename__ = "tag"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    name: str = Column(Text)
    color: str = Column(Text)

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )

    # project: "Project" = Relationship(back_populates="tags")


class LLM(Base):
    __tablename__ = "llm"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    name: str = Column(Text)
    api_base: str = Column(Text)

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid", onupdate="CASCADE", ondelete="CASCADE"),
        nullable=True,
    )

    # project: "Project" = Relationship(back_populates="llms")
