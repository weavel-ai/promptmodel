"""APIs for ChatModel"""
from modules.types import PMObject


class ChatModelInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: str
    online: bool

    project_uuid: str


class CreateChatModelBody(PMObject):
    project_uuid: str
    name: str
