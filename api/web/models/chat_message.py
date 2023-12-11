"""APIs for ChatMessage"""
from typing import Dict, Optional, Any, List
from modules.types import PMObject


class ChatMessageInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    role: str
    name: Optional[str] = None
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    function_call: Optional[Dict[str, Any]] = None

    token_count: Optional[int] = None

    chat_message_metadata: Optional[Dict[str, Any]] = None

    session_uuid: str


class ChatLogViewInstance(PMObject):
    project_uuid: str
    chat_model_uuid: str
    chat_model_name: str

    chat_model_version_uuid: str
    chat_model_version: int

    session_uuid: str
    assistant_message_uuid: str

    created_at: str

    user_input: str
    assistant_output: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    function_call: Optional[Dict[str, Any]] = None

    latency: Optional[float] = None
    cost: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None

    run_from_deployment: bool


class ChatLogsCountInstance(PMObject):
    project_uuid: str
    count: int
