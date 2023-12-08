"""APIs for FunctionSchema"""
from typing import Any, Dict, Optional

from modules.types import PMObject


class FunctionSchemaInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: str
    parameters: Dict[str, Any]
    online: bool

    description: Optional[str] = None
    mock_response: Optional[Dict[str, Any]] = None

    project_uuid: str
