"""APIs for FunctionModel"""
from typing import Optional
from modules.types import PMObject


class FunctionModelInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: str
    online: bool

    project_uuid: str


class CreateFunctionModelBody(PMObject):
    name: str
    project_uuid: str


class DatasetInstance(PMObject):
    name: str
    uuid: str
    description: Optional[str] = None
