from typing import Optional, List, Dict, Any, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import (
    Column,
    ForeignKey,
    TIMESTAMP,
    Boolean,
    Text,
    Float,
    BigInteger,
    ARRAY,
    Identity,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import UUID as UUIDType
from sqlalchemy.sql import func, text
from base.database import Base

if TYPE_CHECKING:
    from .project import Project


class ChatModel(Base):
    __tablename__ = "chat_model"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        server_default=text("gen_random_uuid()"),
    )

    name: str = Column(Text, nullable=False)
    online: bool = Column(Boolean, nullable=False, default=False)

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "project.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # project: "Project" = Relationship("Project", back_populates="chat_models")
    # project: "Project" = Relationship(back_populates="chat_models")
    # chat_model_versions: List["ChatModelVersion"] = Relationship(
    #     back_populates="chat_model"
    # )


class ChatModelVersion(Base):
    __tablename__ = "chat_model_version"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        server_default=text("gen_random_uuid()"),
    )

    version: int = Column(BigInteger, nullable=False)
    model: str = Column(Text, nullable=False)
    system_prompt: str = Column(Text, nullable=False)
    is_published: bool = Column(Boolean, nullable=False, default=False)

    functions: Optional[List[str]] = Column(ARRAY(Text), nullable=True)
    is_ab_test: Optional[bool] = Column(Boolean, nullable=True)
    ratio: Optional[float] = Column(Float, nullable=True)
    from_version: Optional[int] = Column(BigInteger, nullable=True)
    tags: Optional[List[str]] = Column(ARRAY(Text), nullable=True)
    memo: Optional[str] = Column(Text, nullable=True)

    chat_model_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "chat_model.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # chat_model: "ChatModel" = Relationship(back_populates="chat_model_versions")
    # chat_sessions: List["ChatSession"] = Relationship(
    #     back_populates="chat_model_version"
    # )


class ChatSession(Base):
    __tablename__ = "chat_session"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        server_default=text("gen_random_uuid()"),
    )

    run_from_deployment: bool = Column(Boolean, nullable=False, default=False)

    session_metadata: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    version_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "chat_model_version.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # chat_model_version: "ChatModelVersion" = Relationship(
    #     back_populates="chat_sessions"
    # )
    # chat_messages: List["ChatMessage"] = Relationship(back_populates="chat_session")


class ChatMessage(Base):
    __tablename__ = "chat_message"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        server_default=text("gen_random_uuid()"),
    )

    role: str = Column(Text, nullable=False)

    name: Optional[str] = Column(Text, nullable=True)
    content: Optional[str] = Column(Text, nullable=True)
    tool_calls: Optional[List[Dict[str, Any]]] = Column(ARRAY(JSONB), nullable=True)
    function_call: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    token_count: Optional[int] = Column(BigInteger, nullable=True)
    chat_message_metadata: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    session_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            column="chat_session.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # chat_session: "ChatSession" = Relationship(back_populates="chat_messages")


class ChatLog(Base):
    __tablename__ = "chat_log"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        server_default=text("gen_random_uuid()"),
    )

    user_message_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            column="chat_message.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    assistant_message_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            column="chat_message.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
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

    session_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            column="chat_session.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    prompt_tokens: Optional[int] = Column(BigInteger, nullable=True)
    completion_tokens: Optional[int] = Column(BigInteger, nullable=True)
    total_tokens: Optional[int] = Column(BigInteger, nullable=True)
    latency: Optional[float] = Column(Float, nullable=True)
    cost: Optional[float] = Column(Float, nullable=True)
