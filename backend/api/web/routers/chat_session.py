"""APIs for ChatSession"""
from typing import Annotated, Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import JWT, get_jwt
from db_models import *
from ..models import ChatSessionInstance

router = APIRouter()


@router.get("", response_model=List[ChatSessionInstance])
async def fetch_chat_sessions(
    jwt: Annotated[str, Depends(get_jwt)],
    chat_model_version_uuid: str,
    db_session: AsyncSession = Depends(get_session),
):
    try:
        chat_sessions: List[ChatSessionInstance] = [
            ChatSessionInstance(**chat_session.model_dump())
            for chat_session in (
                await db_session.execute(
                    select(ChatSession)
                    .where(ChatSession.version_uuid == chat_model_version_uuid)
                    .order_by(desc(ChatSession.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return chat_sessions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
