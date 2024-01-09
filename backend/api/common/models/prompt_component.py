"""API models for PromptComponent"""

from typing import Optional, List, Dict, Any
from modules.types import PMObject
from api.web.models.run_log import RunLogInstance

class CreatePromptComponentBody(PMObject):
    name: str
    project_uuid: str
    
class CreatePromptComponentVersionBody(PMObject):
    name: str
    version: int
    project_uuid: str
    
class CreateComponentLogBody(PMObject):
    name: str
    version: int
    
class CreateComponentLogResponse(PMObject):
    uuid: str
    
class ConnectComponentRunLogBody(PMObject):
    component_log_uuid: str
    run_log_uuid: str
    
class ScoreComponentRunLogBody(PMObject):
    component_log_uuid: str
    scores: Dict[str, Any]

class PromptComponentInstance(PMObject):
    uuid: str
    name: str
    created_at: str
    version_list: List[int]
    
class PromptComponentVersionInstance(PMObject):
    uuid: str
    name: str
    version: int
    created_at: str
    # function_model_uuid_list: List[str]
    # function_model_version_uuid_list: List[str]

class ComponentLogInstance(PMObject):
    uuid: str
    created_at: str
    version_uuid: str
    run_log_instance_list: List[RunLogInstance]
    scores: Dict[str, Any]
