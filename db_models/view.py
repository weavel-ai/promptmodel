# Views are used to query data from multiple tables
# These are read-only models, so they should not be migrated
from typing import Optional, List, Dict, Any, Union, Tuple
from datetime import datetime, date
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
    Date,
    Identity,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from uuid import uuid4, UUID as UUIDType
from sqlalchemy.sql import func, text
from sqlmodel import SQLModel, Field, Relationship


class UserOrganizations(SQLModel, table=True):
    __tablename__ = "user_organizations"

    user_id: str = Field(sa_column=Column(Text, primary_key=True))
    organization_id: str = Field(sa_column=Column(Text))

    name: str = Field(sa_column=Column(Text))
    slug: str = Field(sa_column=Column(Text))


class ChatLogView(SQLModel, table=True):
    __tablename__ = "chat_log_view"

    assistant_log_id: int = Field(
        sa_column=Column(BigInteger)
    )  # TODO: fix this into UUID

    project_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))

    chat_model_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True)
    )
    chat_model_name: str = Field(sa_column=Column(Text))

    chat_model_version_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))
    chat_model_version: int = Field(sa_column=Column(BigInteger))

    session_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))

    created_at: datetime = Field(sa_column=Column(TIMESTAMP))

    user_input: str = Field(sa_column=Column(Text))
    assistant_output: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    tool_calls: Optional[Dict[str, Any]] = Field(sa_column=Column(JSONB, nullable=True))

    latency: Optional[float] = Field(sa_column=Column(Float, nullable=True))
    cost: Optional[float] = Field(sa_column=Column(Float, nullable=True))
    token_usage: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )

    run_from_deployment: bool = Field(sa_column=Column(Boolean))


class ChatLogsCount(SQLModel, table=True):
    __tablename__ = "chat_logs_count"

    project_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True)
    )
    chat_logs_count: int = Field(sa_column=Column(BigInteger))


class RunLogsCount(SQLModel, table=True):
    __tablename__ = "run_logs_count"

    project_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True)
    )
    run_logs_count: int = Field(sa_column=Column(BigInteger))


class DailyChatLogMetric(SQLModel, table=True):
    __tablename__ = "daily_chat_log_metric"

    project_name: str = Field(sa_column=Column(Text))
    chat_model_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True)
    )
    chat_model_name: str = Field(sa_column=Column(Text))

    day: date = Field(sa_column=Column(Date))
    total_cost: float = Field(sa_column=Column(Float))
    avg_latency: float = Field(sa_column=Column(Float))
    total_token_usage: Dict[str, Any] = Field(sa_column=Column(JSONB))
    total_chat_sessions: int = Field(sa_column=Column(BigInteger))


class DailyRunLogMetric(SQLModel, table=True):
    __tablename__ = "daily_run_log_metric"

    prompt_model_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True)
    )
    prompt_model_name: str = Field(sa_column=Column(Text))

    day: date = Field(sa_column=Column(Date))
    total_cost: float = Field(sa_column=Column(Float))
    avg_latency: float = Field(sa_column=Column(Float))
    total_token_usage: Dict[str, Any] = Field(sa_column=Column(JSONB))
    total_runs: int = Field(sa_column=Column(BigInteger))


class DeployedChatModelVersion(SQLModel, table=True):
    __tablename__ = "deployed_chat_model_version"

    id: int = Field(sa_column=Column(BigInteger))
    created_at: datetime = Field(sa_column=Column(TIMESTAMP))
    uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True), primary_key=True))

    version: int = Field(sa_column=Column(BigInteger))
    model: str = Field(sa_column=Column(Text))
    system_prompt: str = Field(sa_column=Column(Text))

    is_published: bool = Field(sa_column=Column(Boolean))
    is_ab_test: Optional[bool] = Field(sa_column=Column(Boolean, nullable=True))
    ratio: Optional[float] = Field(sa_column=Column(Float, nullable=True))

    from_version: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True))
    chat_model_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))


class DeployedPromptModelVersion(SQLModel, table=True):
    __tablename__ = "deployed_prompt_model_version"

    id: int = Field(sa_column=Column(BigInteger))
    created_at: datetime = Field(sa_column=Column(TIMESTAMP))
    uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True), primary_key=True))

    version: int = Field(sa_column=Column(BigInteger))
    model: str = Field(sa_column=Column(Text))
    parsing_type: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    output_keys: Optional[List[str]] = Field(
        sa_column=Column(ARRAY(Text), nullable=True)
    )

    is_published: bool = Field(sa_column=Column(Boolean))
    is_ab_test: Optional[bool] = Field(sa_column=Column(Boolean, nullable=True))
    ratio: Optional[float] = Field(sa_column=Column(Float, nullable=True))

    from_version: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True))
    prompt_model_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))


class DeploymentRunLogView(SQLModel, table=True):
    __tablename__ = "deployment_run_log_view"

    project_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))

    prompt_model_uuid: UUIDType = Field(
        sa_column=Column(UUID(as_uuid=True), primary_key=True)
    )
    prompt_model_name: str = Field(sa_column=Column(Text))

    prompt_model_version_uuid: UUIDType = Field(sa_column=Column(UUID(as_uuid=True)))
    prompt_model_version: int = Field(sa_column=Column(BigInteger))

    created_at: datetime = Field(sa_column=Column(TIMESTAMP))

    inputs: Optional[Dict[str, Any]] = Field(sa_column=Column(JSONB, nullable=True))
    raw_output: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    parsed_outputs: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )
    function_call: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )

    token_usage: Optional[Dict[str, Any]] = Field(
        sa_column=Column(JSONB, nullable=True)
    )
    latency: Optional[float] = Field(sa_column=Column(Float, nullable=True))
    cost: Optional[float] = Field(sa_column=Column(Float, nullable=True))

    run_log_metadata: Optional[Dict[str, Any]] = Field(sa_column=Column(JSONB))
    score: Optional[int] = Field(sa_column=Column(BigInteger))

    run_from_deployment: bool = Field(sa_column=Column(Boolean))
