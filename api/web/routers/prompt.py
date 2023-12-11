"""APIs for Prompt"""
from datetime import datetime
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import PromptInstance

router = APIRouter()
# Prompt Endpoint


@router.get("/", response_model=List[PromptInstance])
async def fetch_prompts(
    function_model_version_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompts: List[PromptInstance] = [
            PromptInstance(**prompt.model_dump())
            for prompt in (
                await session.execute(
                    select(Prompt)
                    .where(Prompt.version_uuid == function_model_version_uuid)
                    .order_by(asc(Prompt.step))
                )
            )
            .scalars()
            .all()
        ]
        return prompts
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
