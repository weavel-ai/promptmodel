"""APIs for promptmodel webpage"""
import re
import json
import secrets
from datetime import datetime, timezone
from operator import eq
from typing import Any, Dict, List, Optional, Annotated
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi_nextauth_jwt import NextAuthJWT
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_406_NOT_ACCEPTABLE,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from promptmodel.llms.llm_dev import LLMDev
from promptmodel.types.response import LLMStreamResponse

from utils.logger import logger
from utils.prompt_utils import update_dict

from base.database import get_session
from modules.types import PromptModelRunConfig, ChatModelRunConfig
from db_models import *

router = APIRouter()


# ChatLog Endpoints


@router.get("/session/")
async def fetch_session_chat_logs(
    chat_session_uuid: str,
    page: int,
    rows_per_page: int,
    db_session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs: List[Dict] = [
            chat_log.model_dump()
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


@router.get("/project/")
async def fetch_project_chat_logs(
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs: List[Dict] = [
            chat_log.model_dump()
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


@router.get("/count/")
async def fetch_chat_logs_count(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs_count: int = (
            (
                await session.execute(
                    select(ChatLogsCount).where(
                        ChatLogsCount.project_uuid == project_uuid
                    )
                )
            )
            .scalar_one()
            .model_dump()
        )

        return chat_logs_count
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
