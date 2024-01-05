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


class SampleInput(Base):
    __tablename__ = "sample_input"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True), unique=True, server_default=text("gen_random_uuid()")
    )

    name: Optional[str] = Column(Text, nullable=True)
    content: Dict[str, Any] = Column(JSONB)
    input_keys: List[str] = Column(ARRAY(String))
    online: bool = Column(Boolean, nullable=False, default=False)
    ground_truth: Optional[str] = Column(Text, nullable=True)

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "project.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    function_model_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("function_model.uuid", ondelete="SET NULL"),
        nullable=True,
    )

    # project: "Project" = Relationship(back_populates="sample_inputs")


class Dataset(Base):
    __tablename__ = "dataset"

    id: int = Column(BigInteger, Identity(), unique=True)
    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        server_default=text("gen_random_uuid()"),
        primary_key=True,
    )
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
        
    name: str = Column(Text, nullable=False)
    description: Optional[str] = Column(Text, nullable=True)

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "project.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
    )
    eval_metric_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "eval_metric.uuid",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
    )
    function_model_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "function_model.uuid",
            onupdate="CASCADE",
            ondelete="SET NULL",
        ),
        nullable=True,
    )


class BatchRun(Base):
    __tablename__ = "batch_run"

    id: int = Column(BigInteger, Identity(), unique=True)
    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        server_default=text("gen_random_uuid()"),
        primary_key=True,
    )
    dataset_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "dataset.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
    )

    function_model_version_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "function_model_version.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
    )

    score: float = Column(Float, nullable=True)
    status: str = Column(Text, nullable=False, default="running")
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Optional[datetime] = Column(TIMESTAMP(timezone=True), nullable=True)


class DatasetSampleInput(Base):
    __tablename__ = "dataset_sample_input"

    dataset_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "dataset.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
    sample_input_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "sample_input.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        primary_key=True,
    )
