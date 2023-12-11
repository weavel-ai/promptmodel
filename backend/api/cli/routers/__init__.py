from fastapi import APIRouter

from .cli import router as cli_router

router = APIRouter()
router.include_router(cli_router)
