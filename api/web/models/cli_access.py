"""APIs for CliAccess"""
from modules.types import PMObject


class UpdateCliAccessKeyBody(PMObject):
    user_id: str
    api_key: str


class CliAccessInstance(PMObject):
    user_id: str
    api_key: str
