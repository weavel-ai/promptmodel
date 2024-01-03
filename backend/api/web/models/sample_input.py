"""APIs for SampleInput"""
from typing import Any, Dict, List, Optional

from modules.types import PMObject


class SampleInputInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: Optional[str] = None
    content: Dict[str, Any]
    input_keys: Optional[List[str]] = None
    online: bool

    project_uuid: str
    function_model_uuid: Optional[str] = None


class CreateSampleInputBody(PMObject):
    project_uuid: str
    name: Optional[str] = None
    content: Dict[str, Any]
    function_model_uuid: Optional[str] = None
    input_keys: List[str]
    ground_truth: Optional[str] = None


class CreateDatasetBody(PMObject):
    project_uuid: str
    function_model_uuid: Optional[str] = None
    name: str
    description: Optional[str] = None
    
class DatasetInstance(PMObject):
    uuid: str
    name: str
    description: Optional[str] = None
    project_uuid: str
    eval_metric_uuid: Optional[str] = None
    function_model_uuid: Optional[str] = None