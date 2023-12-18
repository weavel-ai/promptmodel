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

    project_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("project.uuid", onupdate="CASCADE"),
        nullable=False,
    )
    
    function_model_uuid: UUIDType = Column(
        UUID(as_uuid=True),
        ForeignKey("function_model.uuid", onupdate="SET NULL"),
        nullable=True,
    )

    # project: "Project" = Relationship(back_populates="sample_inputs")
