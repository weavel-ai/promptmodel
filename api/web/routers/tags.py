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


# Tags Endpoints
@router.get("/")
async def fetch_tags(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        tags: List[Dict] = [
            tag.model_dump()
            for tag in (
                await session.execute(
                    select(Tag)
                    .where(Tag.project_uuid == project_uuid)
                    .order_by(asc(Tag.name))
                )
            )
            .scalars()
            .all()
        ]
        return tags
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class CreateTagBody(BaseModel):
    project_uuid: str
    name: str
    color: str


@router.post("/")
async def create_tag(
    body: CreateTagBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check if same name in project
        tag_in_db = (
            await session.execute(
                select(Tag)
                .where(Tag.name == body.name)
                .where(Tag.project_uuid == body.project_uuid)
            )
        ).scalar_one_or_none()

        if tag_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )

        new_tag = Tag(**body.model_dump())
        session.add(new_tag)
        await session.commit()
        await session.refresh(new_tag)

        return new_tag.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
