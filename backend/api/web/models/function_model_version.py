"""APIs for FunctionModelVersion"""
from typing import List, Optional

from modules.types import PMObject


class FunctionModelVersionInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    version: int
    model: str
    is_published: bool

    from_version: Optional[int] = None
    parsing_type: Optional[str] = None
    output_keys: Optional[List[str]] = None

    functions: Optional[List[str]] = None
    is_ab_test: Optional[bool] = None
    ratio: Optional[float] = None
    tags: Optional[List[str]] = None
    memo: Optional[str] = None

    function_model_uuid: str


class UpdatePublishedFunctionModelVersionBody(PMObject):
    project_uuid: str
    project_version: int
    previous_published_version_uuid: Optional[str] = None


class UpdateFunctionModelVersionTagsBody(PMObject):
    tags: Optional[List[str]] = None


class BatchRunConfigBody(PMObject):
    dataset_uuid: str
    function_model_version_uuid: str


class DatasetBatchRunInstance(PMObject):
    dataset_uuid: str
    dataset_name: str
    dataset_description: Optional[str] = None
    eval_metric_uuid: str = None
    eval_metric_name: str = None
    eval_metric_description: Optional[str] = None
    batch_run_uuid: Optional[str] = None
    batch_run_score: Optional[float] = None
    batch_run_status: Optional[str] = None
    batch_run_created_at: Optional[str] = None

class FunctionModelVersionBatchRunInstance(PMObject):
    batch_run_uuid: str
    batch_run_status: str
    batch_run_score: Optional[float] = None