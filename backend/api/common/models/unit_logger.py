"""API models for UnitLogger"""

from typing import Optional, List, Dict, Any
from modules.types import PMObject

class CreateUnitLoggerBody(PMObject):
    name: str
    project_uuid: str
    
class CreateUnitLoggerVersionBody(PMObject):
    name: str
    version: int
    project_uuid: str
    
class CreateUnitLogBody(PMObject):
    name: str
    version: int
    
class CreateUnitLogResponse(PMObject):
    name: str
    version: int
    version_uuid: str
    log_uuid: str
    
class ConnectUnitLogRunLogBody(PMObject):
    unit_log_uuid: str
    run_log_uuid: str
    
class ScoreUnitLogBody(PMObject):
    unit_log_uuid: str
    scores: Dict[str, Any]

class UnitLoggerInstance(PMObject):
    uuid: str
    name: str
    created_at: str
    version_list: List[int]
    
class UnitLoggerVersionInstance(PMObject):
    uuid: str
    name: str
    version: int
    created_at: str
    # function_model_uuid_list: List[str]
    # function_model_version_uuid_list: List[str]

class RunLogInstance(PMObject): # same with api.web.models.run_log.RunLogInstance, handle circular import
    id: int
    created_at: str
    uuid: str

    run_from_deployment: bool

    inputs: Optional[Dict[str, Any]] = None
    raw_output: Optional[str] = None
    parsed_outputs: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    function_call: Optional[Dict[str, Any]] = None

    run_log_metadata: Optional[Dict[str, Any]] = None

    latency: Optional[float] = None
    cost: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None

    version_uuid: str
    project_uuid: str
    sample_input_uuid: Optional[str] = None

class UnitLogInstance(PMObject):
    uuid: str
    created_at: str
    version_uuid: str
    run_log_instance_list: List[RunLogInstance]
    scores: Dict[str, Any]
