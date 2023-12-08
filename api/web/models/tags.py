"""APIs for Tags"""
from modules.types import PMObject


class TagsInstance(PMObject):
    id: int
    created_at: str

    name: str
    color: str

    project_uuid: str


class CreateTagsBody(PMObject):
    project_uuid: str
    name: str
    color: str
