"""APIs for Organization"""
from modules.types import PMObject


class CreateOrganizationBody(PMObject):
    organization_id: str
    name: str
    user_id: str
    slug: str


class OrganizationInstance(PMObject):
    id: int
    organization_id: str
    created_at: str
    name: str
    slug: str
