"""APIs for PromptModel"""
from modules.types import PMObject


class PromptModelInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: str
    online: bool

    project_uuid: str


class CreatePromptModelBody(PMObject):
    name: str
    project_uuid: str
