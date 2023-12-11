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
from base.database import Base


class UserOrganizations(Base):
    __tablename__ = "user_organizations"

    user_id: str = Column(Text, primary_key=True)
    organization_id: str = Column(Text, primary_key=True)

    name: str = Column(Text)
    slug: str = Column(Text)


class ChatLogView(Base):
    __tablename__ = "chat_log_view"

    project_uuid: UUIDType = Column(UUID(as_uuid=True))

    chat_model_uuid: UUIDType = Column(UUID(as_uuid=True))
    chat_model_name: str = Column(Text)

    chat_model_version_uuid: UUIDType = Column(UUID(as_uuid=True))
    chat_model_version: int = Column(BigInteger)

    session_uuid: UUIDType = Column(UUID(as_uuid=True))
    assistant_message_uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)

    created_at: datetime = Column(TIMESTAMP)

    user_input: str = Column(Text)
    assistant_output: Optional[str] = Column(Text, nullable=True)
    tool_calls: Optional[List[Dict[str, Any]]] = Column(ARRAY(JSONB), nullable=True)
    function_call: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    latency: Optional[float] = Column(Float, nullable=True)
    cost: Optional[float] = Column(Float, nullable=True)
    prompt_tokens: Optional[int] = Column(BigInteger, nullable=True)
    completion_tokens: Optional[int] = Column(BigInteger, nullable=True)
    total_tokens: Optional[int] = Column(BigInteger, nullable=True)

    run_from_deployment: bool = Column(Boolean)


class ChatLogsCount(Base):
    __tablename__ = "chat_logs_count"

    project_uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)

    chat_logs_count: int = Column(BigInteger)


class RunLogsCount(Base):
    __tablename__ = "run_logs_count"

    project_uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)

    run_logs_count: int = Column(BigInteger)


class DailyChatLogMetric(Base):
    __tablename__ = "daily_chat_message_metric"

    project_name: str = Column(Text)

    chat_model_uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)
    chat_model_name: str = Column(Text)

    day: date = Column(Date, primary_key=True)
    total_cost: Optional[float] = Column(Float)
    avg_latency: Optional[float] = Column(Float)
    total_token_usage: Dict[str, Any] = Column(JSONB)
    total_chat_sessions: int = Column(BigInteger)


class DailyRunLogMetric(Base):
    __tablename__ = "daily_run_log_metric"

    function_model_uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)

    function_model_name: str = Column(Text)

    day: date = Column(Date, primary_key=True)
    total_cost: Optional[float] = Column(Float)
    avg_latency: Optional[float] = Column(Float)
    total_token_usage: Dict[str, Any] = Column(JSONB)
    total_runs: int = Column(BigInteger)


class DeployedChatModelVersion(Base):
    __tablename__ = "deployed_chat_model_version"

    id: int = Column(BigInteger)
    created_at: datetime = Column(TIMESTAMP)
    uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)

    version: int = Column(BigInteger)
    model: str = Column(Text)
    system_prompt: str = Column(Text)

    is_published: bool = Column(Boolean)
    is_ab_test: Optional[bool] = Column(Boolean, nullable=True)
    ratio: Optional[float] = Column(Float, nullable=True)

    from_version: Optional[int] = Column(BigInteger, nullable=True)
    chat_model_uuid: UUIDType = Column(UUID(as_uuid=True))


class DeployedFunctionModelVersion(Base):
    __tablename__ = "deployed_function_model_version"

    id: int = Column(BigInteger)
    created_at: datetime = Column(TIMESTAMP)
    uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)

    version: int = Column(BigInteger)
    model: str = Column(Text)
    parsing_type: Optional[str] = Column(Text, nullable=True)
    output_keys: Optional[List[str]] = Column(ARRAY(Text), nullable=True)

    is_published: bool = Column(Boolean)
    is_ab_test: Optional[bool] = Column(Boolean, nullable=True)
    ratio: Optional[float] = Column(Float, nullable=True)

    from_version: Optional[int] = Column(BigInteger, nullable=True)
    function_model_uuid: UUIDType = Column(UUID(as_uuid=True))


class DeploymentRunLogView(Base):
    __tablename__ = "deployment_run_log_view"

    run_log_uuid: UUIDType = Column(UUID(as_uuid=True), primary_key=True)
    project_uuid: UUIDType = Column(UUID(as_uuid=True))

    function_model_uuid: UUIDType = Column(UUID(as_uuid=True))
    function_model_name: str = Column(Text)

    function_model_version_uuid: UUIDType = Column(UUID(as_uuid=True))
    function_model_version: int = Column(BigInteger)

    created_at: datetime = Column(TIMESTAMP)

    inputs: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)
    raw_output: Optional[str] = Column(Text, nullable=True)
    parsed_outputs: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)

    function_call: Optional[Dict[str, Any]] = Column(JSONB, nullable=True)
    tool_calls: Optional[List[Dict[str, Any]]] = Column(ARRAY(JSONB), nullable=True)

    prompt_tokens: Optional[int] = Column(BigInteger, nullable=True)
    completion_tokens: Optional[int] = Column(BigInteger, nullable=True)
    total_tokens: Optional[int] = Column(BigInteger, nullable=True)
    latency: Optional[float] = Column(Float, nullable=True)
    cost: Optional[float] = Column(Float, nullable=True)

    run_log_metadata: Optional[Dict[str, Any]] = Column(JSONB)
    score: Optional[int] = Column(BigInteger)

    run_from_deployment: bool = Column(Boolean)
