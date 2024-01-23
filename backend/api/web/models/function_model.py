"""APIs for FunctionModel"""
from typing import Optional, List
from modules.types import PMObject


class FunctionModelInstance(PMObject):
    id: int
    created_at: str
    uuid: str

    name: str
    online: bool

    project_uuid: str


class CreateFunctionModelBody(PMObject):
    name: str
    project_uuid: str


class DatasetForFunctionModelInstance(PMObject):
    dataset_name: str
    dataset_uuid: str
    dataset_description: Optional[str] = None
    eval_metric_name: str
    eval_metric_uuid: str
    eval_metric_description: Optional[str] = None

class PublicOrganizationInstance(PMObject):
    name: str
    slug: str

class PublicFunctionModelInstance(PMObject):
    id: int
    uuid: str
    created_at: str
    name: str
    online: bool
    project_uuid: str
    project_name: str
    project_description: Optional[str] = None
    organization: PublicOrganizationInstance