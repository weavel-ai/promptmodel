"""APIs for RunLog"""
from typing import Any, Dict, Optional

from modules.types import PMObject


class RunLogInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    run_from_deployment: bool

    input_register_name: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    raw_output: Optional[str] = None
    parsed_outputs: Optional[Dict[str, Any]] = None
    function_call: Optional[Dict[str, Any]] = None

    run_log_metadata: Optional[Dict[str, Any]] = None
    score: Optional[int] = None

    token_usage: Optional[Dict[str, Any]]
    latency: Optional[float] = None
    cost: Optional[float] = None

    version_uuid: str


class DeploymentRunLogViewInstance(PMObject):
    project_uuid: str

    prompt_model_uuid: str
    prompt_model_name: str

    prompt_model_version_uuid: str
    prompt_model_version: int

    created_at: str

    inputs: Optional[Dict[str, Any]] = None
    raw_output: Optional[str] = None
    parsed_outputs: Optional[Dict[str, Any]] = None
    function_call: Optional[Dict[str, Any]] = None

    token_usage: Optional[Dict[str, Any]] = None
    latency: Optional[float] = None
    cost: Optional[float] = None

    run_log_metadata: Optional[Dict[str, Any]] = None
    score: Optional[int] = None

    run_from_deployment: bool = True


class RunLogsCountInstance(PMObject):
    project_uuid: str
    count: int
