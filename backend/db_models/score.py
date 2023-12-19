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


class Score(Base):
    __tablename__ = "score"
    
    id: int = Column(BigInteger, Identity(), unique=True, primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    run_log_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("run_log.uuid"),
        nullable=True,
    )
    chat_session_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_session.uuid"),
        nullable=True,
    )
    eval_metric_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("eval_metric.uuid"),
        nullable=False,
    )
    
    value: int = Column(Integer, nullable=False)