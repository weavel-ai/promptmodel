"""APIs for ChatLogSession"""
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from modules.types import PMObject
from db_models import *
from ..models import ChatLogInstance

router = APIRouter()


@router.get("/", response_model=List[ChatLogInstance])
async def fetch_chat_log_sessions(
    chat_model_version_uuid: str,
    db_session: AsyncSession = Depends(get_session),
):
    try:
        chat_log_sessions: List[ChatLogInstance] = [
            ChatLogInstance(**chat_log_session.model_dump())
            for chat_log_session in (
                await db_session.execute(
                    select(ChatLogSession)
                    .where(ChatLogSession.version_uuid == chat_model_version_uuid)
                    .order_by(desc(ChatLogSession.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return chat_log_sessions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
