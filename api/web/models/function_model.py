"""APIs for FunctionModel"""
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
