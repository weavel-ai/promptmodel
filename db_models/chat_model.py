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
        server_default=text("gen_random_uuid()"),
    )

    name: str = Column(Text, nullable=False)
    online: bool = Column(Boolean, nullable=False, default=False)

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True), ForeignKey("project.uuid"), nullable=False
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
        UUID(as_uuid=True), ForeignKey("chat_model.uuid"), nullable=False
    )

    # chat_model: "ChatModel" = Relationship(back_populates="chat_model_versions")
    # chat_log_sessions: List["ChatLogSession"] = Relationship(
    #     back_populates="chat_model_version"
    # )


class ChatLogSession(Base):
    __tablename__ = "chat_log_session"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    run_from_deployment: bool = Column(Boolean, nullable=False, default=False)

    session_metadata: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    version_uuid: UUIDType = Column(
        UUID(as_uuid=True), ForeignKey("chat_model_version.uuid"), nullable=False
    )

    # chat_model_version: "ChatModelVersion" = Relationship(
    #     back_populates="chat_log_sessions"
    # )
    # chat_logs: List["ChatLog"] = Relationship(back_populates="chat_log_session")


class ChatLog(Base):
    __tablename__ = "chat_log"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    role: str = Column(Text, nullable=False)

    name: Optional[str] = Column(Text, nullable=True)
    content: Optional[str] = Column(Text, nullable=True)
    tool_calls: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    token_usage: Optional[int] = Column(BigInteger, nullable=True)

    latency: Optional[float] = Column(Float, nullable=True)
    cost: Optional[float] = Column(Float, nullable=True)
    chat_log_metadata: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    session_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(column="chat_log_session.uuid"),
        nullable=False,
    )

    # chat_log_session: "ChatLogSession" = Relationship(back_populates="chat_logs")
