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


class FunctionModel(Base):
    __tablename__ = "function_model"

    id: int = Column(BigInteger, Identity())
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
        UUID(as_uuid=True), ForeignKey("project.uuid"), nullable=False
    )

    # project: "Project" = Relationship(back_populates="function_models")
    # function_model_versions: List["FunctionModelVersion"] = Relationship(
    #     back_populates="function_model"
    # )


class FunctionModelVersion(Base):
    __tablename__ = "function_model_version"

    id: int = Column(BigInteger, Identity())
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    uuid: UUIDType = Column(
        UUID(as_uuid=True),
        primary_key=True,
        unique=True,
        server_default=text("gen_random_uuid()"),
    )

    version: int = Column(BigInteger)
    model: str = Column(Text)
    is_published: bool = Column(Boolean, default=False)

    from_version: Optional[int] = Column(BigInteger, nullable=True)
    parsing_type: Optional[str] = Column(
        Text,
        ForeignKey("parsing_type.type", onupdate="CASCADE", ondelete="SET NULL"),
        nullable=True,
    )

    output_keys: Optional[List[str]] = Column(ARRAY(Text), nullable=True)

    functions: Optional[List[str]] = Column(ARRAY(Text), nullable=True)
    is_ab_test: Optional[bool] = Column(Boolean, nullable=True)
    ratio: Optional[float] = Column(Float, nullable=True)
    tags: Optional[List[str]] = Column(ARRAY(Text), nullable=True)
    memo: Optional[str] = Column(Text, nullable=True)

    function_model_uuid: UUIDType = Column(
        UUID(as_uuid=True), ForeignKey("function_model.uuid"), nullable=False
    )

    # function_model: "FunctionModel" = Relationship(back_populates="function_model_versions")
    # prompts: List["Prompt"] = Relationship(back_populates="function_model_version")
    # run_logs: List["RunLog"] = Relationship(back_populates="function_model_version")


class Prompt(Base):
    __tablename__ = "prompt"

    id: int = Column(BigInteger, Identity(), primary_key=True)
    created_at: datetime = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    role: str = Column(Text, nullable=False)
    step: int = Column(BigInteger, nullable=False, default=1)
    content: str = Column(Text)

    version_uuid: UUIDType = Column(
        UUID(as_uuid=True), ForeignKey("function_model_version.uuid"), nullable=False
    )

    # function_model_version: "FunctionModelVersion" = Relationship(back_populates="prompts")


class RunLog(Base):
    __tablename__ = "run_log"

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

    run_from_deployment: bool = Column(Boolean, default=True)

    input_register_name: Optional[str] = Column(Text, nullable=True)
    inputs: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)
    raw_output: Optional[str] = Column(Text, nullable=True)
    parsed_outputs: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    run_log_metadata: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    function_call: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)
    tool_calls: Optional[List[Dict[str, Any]]] = Column(ARRAY(JSONB), nullable=True)

    score: Optional[int] = Column(BigInteger, nullable=True)

    prompt_tokens: Optional[int] = Column(BigInteger, nullable=True)
    completion_tokens: Optional[int] = Column(BigInteger, nullable=True)
    total_tokens: Optional[int] = Column(BigInteger, nullable=True)
    latency: Optional[float] = Column(Float, nullable=True)
    cost: Optional[float] = Column(Float, nullable=True)

    version_uuid: UUIDType = Column(
        UUID(as_uuid=True), ForeignKey("function_model_version.uuid"), nullable=False
    )

    # function_model_version: "FunctionModelVersion" = Relationship(back_populates="run_logs")
