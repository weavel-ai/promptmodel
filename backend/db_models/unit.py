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
    

class Unit(Base):
    __tablename__ = "unit"

    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    name: str = Column(Text, nullable=False)

    project_uuid: str = Column(
        Text,
        ForeignKey(
            "project.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )


class UnitVersion(Base):
    __tablename__ = "unit_version"

    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    version: int = Column(BigInteger)

    unit_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "unit.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

class UnitLog(Base):
    __tablename__ = "unit_log"
    
    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    version_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "unit_version.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )
    
class UnitLogScore(Base):
    __tablename__ = "unit_log_score"
    
    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    
    unit_log_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "unit_log.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
        primary_key=True,
    )
    eval_metric_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "eval_metric.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
        primary_key=True,
    )
    
    value: float = Column(Float, nullable=False)
    

class UnitLogRunLog(Base):
    __tablename__ = "unit_log_run_log"
    
    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    
    unit_log_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "unit_log.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
        primary_key=True,
    )
    run_log_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "run_log.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
        primary_key=True,
    )