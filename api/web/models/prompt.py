"""APIs for Prompt"""
from modules.types import PMObject


class PromptInstance(PMObject):
    id: int
    created_at: str

    role: str
    step: int
    content: str

    version_uuid: str
