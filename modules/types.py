from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from enum import Enum
from uuid import UUID
from datetime import datetime, date
from sqlalchemy.dialects.postgresql import UUID as PGUUID


class PromptConfig(BaseModel):
    role: str
    step: int
    content: str


class PromptModelRunConfig(BaseModel):
    prompt_model_uuid: str
    prompts: List[PromptConfig]
    model: Optional[str] = "gpt-3.5-turbo"
    from_version: Optional[int] = None
    version_uuid: Optional[str] = None
    sample_name: Optional[str] = None
    parsing_type: Optional[str] = None
    output_keys: Optional[List[str]] = None
    functions: Optional[List[str]] = []


class ChatModelRunConfig(BaseModel):
    chat_model_uuid: str
    system_prompt: str
    user_input: str
    model: Optional[str] = "gpt-3.5-turbo"
    from_version: Optional[int] = None
    session_uuid: Optional[str] = None
    version_uuid: Optional[str] = None
    functions: Optional[List[str]] = []


class RunLog(BaseModel):
    inputs: Dict[str, Any]
    raw_output: str
    parsed_outputs: Dict[str, Any]


class ChatLog(BaseModel):
    role: str
    content: str
    tool_calls: Optional[Dict[str, Any]] = None


class LocalTaskErrorType(str, Enum):
    NO_FUNCTION_NAMED_ERROR = "NO_FUNCTION_NAMED_ERROR"  # no DB update is needed
    FUNCTION_CALL_FAILED_ERROR = "FUNCTION_CALL_FAILED_ERROR"  # create PromptModelVersion, create Prompt, create RunLog
    PARSING_FAILED_ERROR = "PARSING_FAILED_ERROR"  # create PromptModelVersion, create Prompt, create RunLog

    SERVICE_ERROR = "SERVICE_ERROR"  # no DB update is needed


class InstanceType(str, Enum):
    ChatLog = "ChatLog"
    RunLog = "RunLog"
    ChatLogSession = "ChatLogSession"


class PMObject(BaseModel):
    def __init__(self, **data: Any):
        for key, value in data.items():
            if key in self.__annotations__ and self.__annotations__[key] == str:
                if (
                    isinstance(value, UUID)
                    or isinstance(value, PGUUID)
                    or isinstance(value, datetime)
                    or isinstance(value, date)
                ):
                    try:
                        data[key] = str(value)
                    except:
                        data[key] = value
        super().__init__(**data)


class DeployedPromptModelVersionInstance(PMObject):
    uuid: str
    from_version: Optional[int]
    prompt_model_uuid: str
    model: str
    is_published: bool
    is_ab_test: Optional[bool]
    ratio: Optional[float]
    parsing_type: Optional[str]
    output_keys: Optional[List[str]]


class DeployedChatModelVersionInstance(PMObject):
    uuid: str
    from_version: Optional[int]
    chat_model_uuid: str
    model: str
    is_published: bool
    is_ab_test: Optional[bool]
    ratio: Optional[float]
    system_prompt: str


class DeployedPromptModelInstance(PMObject):
    uuid: str
    name: str


class DeployedPromptInstance(PMObject):
    version_uuid: str
    role: str
    content: str
    step: int


class DeployedChatLogInstance(PMObject):
    role: str
    name: Optional[str] = None
    content: Optional[str] = None
    tool_calls: Optional[Dict[str, Any]] = None
