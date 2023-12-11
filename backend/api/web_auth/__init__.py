from fastapi import APIRouter
from .routers import users

router = APIRouter()

router.include_router(users.router)
