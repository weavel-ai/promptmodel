"""APIs for ProjectChangelog"""
from typing import Any, Dict, List
from modules.types import PMObject


class ProjectChangelogInstance(PMObject):
    id: int
    created_at: str

    logs: List[Dict[str, Any]]
    project_uuid: str
