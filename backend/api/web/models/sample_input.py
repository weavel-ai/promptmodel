"""APIs for SampleInput"""
from typing import Any, Dict

from modules.types import PMObject


class SampleInputInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: str
    content: Dict[str, Any]
    online: bool

    project_uuid: str


class CreateSampleInputBody(PMObject):
    project_uuid: str
    name: str
    content: Dict[str, Any]
