from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from enum import Enum


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
