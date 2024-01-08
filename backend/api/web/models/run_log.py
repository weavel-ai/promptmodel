"""APIs for RunLog"""
from typing import Any, Dict, Optional, List

from modules.types import PMObject


class RunLogInstance(PMObject):
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
    
class SaveRunLogBody(PMObject):
    inputs: Optional[Dict[str, Any]] = None
    raw_output: Optional[str] = None
    parsed_outputs: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    function_call: Optional[Dict[str, Any]] = None
    
    sample_input_uuid: Optional[str] = None
    run_log_metadata: Optional[Dict[str, Any]] = None

class DeploymentRunLogViewInstance(PMObject):
    run_log_uuid: str
    project_uuid: str

    function_model_uuid: str
    function_model_name: str

    function_model_version_uuid: str
    function_model_version: int

    created_at: str

    inputs: Optional[Dict[str, Any]] = None
    raw_output: Optional[str] = None
    parsed_outputs: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    function_call: Optional[Dict[str, Any]] = None

    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency: Optional[float] = None
    cost: Optional[float] = None

    run_log_metadata: Optional[Dict[str, Any]] = None

    run_from_deployment: bool = True


class RunLogsCountInstance(PMObject):
    project_uuid: str
    count: int
