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
    from .project import Project


class ChatModel(SQLModel, table=True):
    __tablename__ = "chat_model"

    id: int = Field(sa_column=Column(BigInteger, Identity(), unique=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        )
    )

    name: str = Field(sa_column=Column(Text, nullable=False))
    online: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))

    project_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), ForeignKey("project.uuid"), nullable=False)
    )

    # project: "Project" = Relationship("Project", back_populates="chat_models")
    project: "Project" = Relationship(back_populates="chat_models")
    chat_model_versions: List["ChatModelVersion"] = Relationship(
        back_populates="chat_model"
    )


class ChatModelVersion(SQLModel, table=True):
    __tablename__ = "chat_model_version"

    id: int = Field(sa_column=Column(BigInteger, Identity(), unique=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        )
    )

    version: int = Field(sa_column=Column(BigInteger, nullable=False))
    model: str = Field(sa_column=Column(Text, nullable=False))
    system_prompt: str = Field(sa_column=Column(Text, nullable=False))
    is_published: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))

    functions: Optional[List[str]] = Field(sa_column=Column(ARRAY(Text), nullable=True))
    is_ab_test: Optional[bool] = Field(sa_column=Column(Boolean, nullable=True))
    ratio: Optional[float] = Field(sa_column=Column(Float, nullable=True))
    from_version: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True))
    tags: Optional[List[str]] = Field(sa_column=Column(ARRAY(Text), nullable=True))
    memo: Optional[str] = Field(sa_column=Column(Text, nullable=True))

    chat_model_uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True), ForeignKey("chat_model.uuid"), nullable=False
        )
    )

    chat_model: "ChatModel" = Relationship(back_populates="chat_model_versions")
    chat_log_sessions: List["ChatLogSession"] = Relationship(
        back_populates="chat_model_version"
    )


class ChatLogSession(SQLModel, table=True):
    __tablename__ = "chat_log_session"

    id: int = Field(sa_column=Column(BigInteger, Identity(), unique=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        )
    )

    run_from_deployment: bool = Field(
        sa_column=Column(Boolean, nullable=False, default=False)
    )

    session_metadata: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )

    version_uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True), ForeignKey("chat_model_version.uuid"), nullable=False
        )
    )
    chat_model_version: "ChatModelVersion" = Relationship(
        back_populates="chat_log_sessions"
    )

    chat_logs: List["ChatLog"] = Relationship(back_populates="chat_log_session")


class ChatLog(SQLModel, table=True):
    __tablename__ = "chat_log"

    id: int = Field(sa_column=Column(BigInteger, Identity(), unique=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        )
    )

    role: str = Field(sa_column=Column(Text, nullable=False))

    name: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    content: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    tool_calls: Optional[Dict[str, Any]] = Field(sa_column=Column(JSONB, nullable=True))

    token_usage: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )
    latency: Optional[float] = Field(sa_column=Column(Float, nullable=True))
    cost: Optional[float] = Field(sa_column=Column(Float, nullable=True))
    chat_log_metadata: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )

    session_uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey(column="chat_log_session.uuid"),
            nullable=False,
        )
    )

    chat_log_session: "ChatLogSession" = Relationship(back_populates="chat_logs")
