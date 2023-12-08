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


# Changelog Endpoints
@router.get("/")
async def fetch_changelogs(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        changelogs: List[Dict] = [
            changelog.model_dump()
            for changelog in (
                await session.execute(
                    select(ProjectChangelog)
                    .where(ProjectChangelog.project_uuid == project_uuid)
                    .order_by(desc(ProjectChangelog.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return changelogs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
