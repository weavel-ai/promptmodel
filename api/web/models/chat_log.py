"""APIs for ChatLog"""
from typing import Dict, Optional, Any
from modules.types import PMObject


class ChatLogViewInstance(PMObject):
    assistant_log_id: int
    project_uuid: str
    chat_model_uuid: str
    chat_model_name: str

    chat_model_version_uuid: str
    chat_model_version: int

    session_uuid: str

    created_at: str
    user_input: str
    assistant_output: Optional[str] = None
    tool_calls: Optional[Dict[str, Any]] = None

    latency: Optional[float] = None
    cost: Optional[float] = None
    token_usage: Optional[Dict[str, Any]] = None

    run_from_deployment: bool


class ChatLogCountInstance(PMObject):
    project_uuid: str
    count: int
