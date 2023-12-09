"""APIs for ChatModelVersion"""
from typing import List, Optional
from modules.types import PMObject


class ChatModelVersionInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    version: int
    model: str
    system_prompt: str
    is_published: bool

    functions: Optional[List[str]] = None
    is_ab_test: Optional[bool] = None
    ratio: Optional[float] = None
    from_version: Optional[int] = None
    tags: Optional[List[str]] = None
    memo: Optional[str] = None

    chat_model_uuid: str


class UpdatePublishedChatModelVersionBody(PMObject):
    project_uuid: str
    project_version: int
    previous_published_version_uuid: Optional[str] = None


class UpdateChatModelVersionTagsBody(PMObject):
    tags: Optional[List[str]] = None
