"""APIs for ChatLog"""
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import ChatLogViewInstance, ChatLogCountInstance

router = APIRouter()


# ChatLog Endpoints
@router.get("/session/", response_model=List[ChatLogViewInstance])
async def fetch_session_chat_logs(
    chat_session_uuid: str,
    page: int,
    rows_per_page: int,
    db_session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs: List[ChatLogViewInstance] = [
            ChatLogViewInstance(**chat_log.model_dump())
            for chat_log in (
                await db_session.execute(
                    select(ChatLogView)
                    .where(ChatLogView.session_uuid == chat_session_uuid)
                    .order_by(asc(ChatLogView.created_at))
                    .offset((page - 1) * rows_per_page)
                    .limit(rows_per_page)
                )
            )
            .scalars()
            .all()
        ]
        return chat_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project/", response_model=List[ChatLogViewInstance])
async def fetch_project_chat_logs(
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs: List[ChatLogViewInstance] = [
            ChatLogViewInstance(**chat_log.model_dump())
            for chat_log in (
                await session.execute(
                    select(ChatLogView)
                    .where(ChatLogView.project_uuid == project_uuid)
                    .order_by(desc(ChatLogView.created_at))
                    .offset((page - 1) * rows_per_page)
                    .limit(rows_per_page)
                )
            )
            .scalars()
            .all()
        ]
        return chat_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/count/", response_model=ChatLogCountInstance)
async def fetch_chat_logs_count(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        try:
            chat_logs_count: int = (
                await session.execute(
                    select(ChatLogsCount.chat_logs_count).where(
                        ChatLogsCount.project_uuid == project_uuid
                    )
                )
            ).scalar_one()
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="ChatLogsCount with given project_uuid not found",
            )

        return ChatLogCountInstance(project_uuid=project_uuid, count=chat_logs_count)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
