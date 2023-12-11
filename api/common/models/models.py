from typing import Any, Dict, List, Optional

from modules.types import PMObject


class PromptConfig(PMObject):
    role: str
    step: int
    content: str


class FunctionModelRunConfig(PMObject):
    function_model_uuid: str
    prompts: List[PromptConfig]
    model: Optional[str] = "gpt-3.5-turbo"
    from_version: Optional[int] = None
    version_uuid: Optional[str] = None
    sample_name: Optional[str] = None
    parsing_type: Optional[str] = None
    output_keys: Optional[List[str]] = None
    functions: Optional[List[str]] = []


class ChatModelRunConfig(PMObject):
    chat_model_uuid: str
    system_prompt: str
    user_input: str
    model: Optional[str] = "gpt-3.5-turbo"
    from_version: Optional[int] = None
    session_uuid: Optional[str] = None
    version_uuid: Optional[str] = None
    functions: Optional[List[str]] = []
