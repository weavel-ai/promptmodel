"""APIs for ChatMessage"""
from typing import Annotated, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models import (
    ChatMessageInstance,
    ChatLogViewInstance,
    ChatLogsCountInstance,
)

router = APIRouter()


# ChatMessage Endpoints
@router.get("/session", response_model=List[ChatMessageInstance])
async def fetch_session_chat_messages(
    jwt: Annotated[str, Depends(get_jwt)],
    chat_session_uuid: str,
    page: int,
    rows_per_page: int,
    db_session: AsyncSession = Depends(get_session),
):
    chat_messages: List[ChatMessageInstance] = [
        ChatMessageInstance(**chat_message.model_dump())
        for chat_message in (
            await db_session.execute(
                select(ChatMessage)
                .where(ChatMessage.session_uuid == chat_session_uuid)
                .order_by(asc(ChatMessage.created_at))
                .offset(max(0, (page - 1)) * rows_per_page)
                .limit(rows_per_page)
            )
        )
        .scalars()
        .all()
    ]
    return chat_messages



@router.get("/project", response_model=List[ChatLogViewInstance])
async def fetch_project_chat_messages(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
):
    check_user_auth = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not check_user_auth:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

    chat_messages: List[ChatLogViewInstance] = [
        ChatLogViewInstance(**chat_message.model_dump())
        for chat_message in (
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
    return chat_messages



@router.get("/count", response_model=ChatLogsCountInstance)
async def fetch_chat_logs_count(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
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

    return ChatLogsCountInstance(project_uuid=project_uuid, count=chat_logs_count)

