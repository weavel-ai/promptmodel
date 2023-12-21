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
from sqlalchemy.sql import func
from uuid import uuid4, UUID as UUIDType
from base.database import Base


class RunLogScore(Base):
    __tablename__ = "run_log_score"

    id: int = Column(BigInteger, Identity(), unique=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    run_log_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("run_log.uuid"),
        nullable=False,
        primary_key=True,
    )
    eval_metric_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("eval_metric.uuid"),
        nullable=False,
        primary_key=True,
    )

    value: int = Column(Integer, nullable=False)


class ChatSessionScore(Base):
    __tablename__ = "chat_session_score"

    id: int = Column(BigInteger, Identity(), unique=True, primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    chat_session_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_session.uuid"),
        nullable=False,
    )

    eval_metric_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("eval_metric.uuid"),
        nullable=False,
    )

    value: int = Column(Integer, nullable=False)
