from fastapi import APIRouter

from .web import router as web_router

router = APIRouter()
router.include_router(web_router)
