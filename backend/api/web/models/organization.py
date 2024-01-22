"""APIs for Organization"""
from typing import Dict, Optional

from pydantic import BaseModel
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
    
class OrganizationInstanceBySlug(PMObject):
    name: str
    organization_id: str

class UpsertLLMProviderConfigBody(PMObject):
    provider_name: str
    env_vars: Optional[Dict[str, str]] = None
    params: Optional[Dict[str, str]] = None


class LLMProviderArgs(BaseModel):
    api_key: Optional[str] = None
    api_base: Optional[str] = None
    api_version: Optional[str] = None
