from typing import Optional, List, Dict, Any

from modules.types import PMObject


class DeployedPromptModelVersionInstance(PMObject):
    uuid: str
    from_version: Optional[int]
    prompt_model_uuid: str
    model: str
    is_published: bool
    is_ab_test: Optional[bool]
    ratio: Optional[float]
    parsing_type: Optional[str]
    output_keys: Optional[List[str]]


class DeployedChatModelVersionInstance(PMObject):
    uuid: str
    from_version: Optional[int]
    chat_model_uuid: str
    model: str
    is_published: bool
    is_ab_test: Optional[bool]
    ratio: Optional[float]
    system_prompt: str


class DeployedPromptModelInstance(PMObject):
    uuid: str
    name: str


class DeployedPromptInstance(PMObject):
    version_uuid: str
    role: str
    content: str
    step: int


class UsersOrganizationsInstance(PMObject):
    organization_id: str
    name: str
    slug: str


class CliProjectInstance(PMObject):
    uuid: str
    name: str
    description: Optional[str]
    version: int


class ProjectStatus(PMObject):
    prompt_models: List[DeployedPromptModelInstance]
    prompt_model_versions: List[DeployedPromptModelVersionInstance]
    prompts: List[DeployedPromptInstance]


class CheckUpdateResponseInstance(PMObject):
    need_update: bool
    version: int
    project_status: Optional[ProjectStatus] = None


class FetchPromptModelVersionResponseInstance(PMObject):
    prompt_model_versions: List[DeployedPromptModelVersionInstance]
    prompts: List[DeployedPromptInstance]


class CliChatLogInstance(PMObject):
    role: str
    name: Optional[str] = None
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


class FetchChatModelVersionResponseInstance(PMObject):
    chat_model_versions: List[DeployedChatModelVersionInstance]
    chat_logs: List[CliChatLogInstance]
