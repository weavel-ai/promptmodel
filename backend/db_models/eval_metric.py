from datetime import datetime
from typing import List
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
from uuid import uuid4, UUID as UUIDType
from base.database import Base


class EvalMetric(Base):
    __tablename__ = "eval_metric"
    
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

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid"),
        nullable=False,
    )
    function_model_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("function_model.uuid"),
        nullable=True,
    )
    chat_model_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("chat_model.uuid"),
        nullable=True,
    )

    name: str = Column(Text, nullable=False)
    description: str = Column(Text, nullable=True)

    extent: List[int] = Column(ARRAY(Integer), nullable=True)