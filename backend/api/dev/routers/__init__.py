from fastapi import APIRouter

from .dev import router as dev_router

router = APIRouter()
router.include_router(dev_router)
