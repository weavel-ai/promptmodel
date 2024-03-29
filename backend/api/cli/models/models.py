from typing import Optional, List, Dict, Any

from modules.types import PMObject
# from litellm.utils import ModelResponse


class DeployedFunctionModelVersionInstance(PMObject):
    uuid: str
    from_version: Optional[int]
    version: int
    function_model_uuid: str
    model: str
    is_published: bool
    is_ab_test: Optional[bool]
    ratio: Optional[float]
    parsing_type: Optional[str]
    output_keys: Optional[List[str]]


class DeployedChatModelVersionInstance(PMObject):
    uuid: str
    version: int
    from_version: Optional[int]
    chat_model_uuid: str
    model: str
    is_published: bool
    is_ab_test: Optional[bool]
    ratio: Optional[float]
    system_prompt: str


class DeployedFunctionModelInstance(PMObject):
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
    function_models: List[DeployedFunctionModelInstance]
    function_model_versions: List[DeployedFunctionModelVersionInstance]
    prompts: List[DeployedPromptInstance]


class CheckUpdateResponseInstance(PMObject):
    need_update: bool
    version: int
    project_status: Optional[ProjectStatus] = None


class FetchFunctionModelVersionResponseInstance(PMObject):
    function_model_version: DeployedFunctionModelVersionInstance
    prompts: List[DeployedPromptInstance]


class CliChatMessageInstance(PMObject):
    role: str
    name: Optional[str] = None
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


class FetchChatModelVersionResponseInstance(PMObject):
    chat_model_versions: List[DeployedChatModelVersionInstance]
    chat_messages: List[CliChatMessageInstance]

class ModelResponse(PMObject):
    id: str
    choices: List[Dict[str, Any]]
    created: int
    model: str
    object: str
    system_fingerprint: Optional[str] = None
    usage: Dict[str, Any]
    response_ms: Optional[float] = None
    _response_ms: Optional[float] = None

class ChatMessageRequestBody(PMObject):
    uuid: str
    message: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None
    api_response: Optional[ModelResponse] = None

class RunLogRequestBody(PMObject):
    uuid: str
    api_response: Optional[ModelResponse] = None
    inputs: Optional[Dict[str, Any]] = None
    parsed_outputs: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict] = None
