"""APIs for User Table"""
from modules.types import PMObject


# User Endpoints
class CreateUserBody(PMObject):
    user_id: str
    email: str


class UserInstance(PMObject):
    id: int
    created_at: str
    user_id: str
    email: str
    is_test: bool
