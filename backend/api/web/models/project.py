"""APIs for Project Table"""
from typing import Optional

from modules.types import PMObject


class CreateProjectBody(PMObject):
    organization_id: str
    name: str
    description: Optional[str] = None


class ProjectInstance(PMObject):
    id: int
    uuid: str
    created_at: str

    name: str
    api_key: str
    version: int
    online: bool

    organization_id: str

    description: Optional[str] = None
    cli_access_token: Optional[str] = None
