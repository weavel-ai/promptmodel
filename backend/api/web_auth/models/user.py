from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserRead(UserBase):
    user_id: str
    # Exclude fields like `hashed_password`


class UserUpdate(UserBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    # Any other fields that can be updated
