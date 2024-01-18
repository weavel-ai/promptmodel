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


class FunctionSchema(Base):
    __tablename__ = "function_schema"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True), unique=True, server_default=text("gen_random_uuid()")
    )

    name: str = Column(Text, nullable=False)
    parameters: Dict[str, Any] = Column(JSONB, nullable=False)
    online: bool = Column(Boolean, nullable=False, default=False)

    description: Optional[str] = Column(Text, nullable=True)
    mock_response: Optional[str] = Column(Text, nullable=True)

    project_uuid: str = Column(
        Text,
        ForeignKey(
            "project.uuid",
            onupdate="CASCADE",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    # project: "Project" = Relationship(back_populates="function_schemas")
