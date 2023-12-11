"""APIs for ChatSession"""
from typing import Any, Dict, Optional
from modules.types import PMObject


class ChatSessionInstance(PMObject):
    id: int
    created_at: str
    uuid: str
    run_from_deployment: bool

    session_metadata: Optional[Dict[str, Any]] = None

    version_uuid: str
