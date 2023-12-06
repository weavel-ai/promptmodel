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


class SampleInput(SQLModel, table=True):
    __tablename__ = "sample_input"

    id: int = Field(sa_column=Column(BigInteger, Identity(), primary_key=True))
    created_at: datetime = Field(
        sa_column=Column(
            TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
        )
    )
    uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True), unique=True, server_default=text("gen_random_uuid()")
        )
    )

    name: str = Field(sa_column=Column(Text))
    content: Dict[str, Any] = Field(sa_column=Column(JSONB))
    online: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))

    project_uuid: UUIDType = Field(
        sa_column=Column(
            UUID(as_uuid=True),
            ForeignKey("project.uuid"),
            nullable=False,
            onupdate="CASCADE",
        )
    )

    project: "Project" = Relationship(back_populates="sample_inputs")
