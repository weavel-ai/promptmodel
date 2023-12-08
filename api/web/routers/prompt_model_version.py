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


# PromptModelVersion Endpoints
@router.get("/")
async def fetch_prompt_model_versions(
    prompt_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_model_versions: List[Dict] = [
            prompt_model_version.model_dump()
            for prompt_model_version in (
                await session.execute(
                    select(PromptModelVersion)
                    .where(PromptModelVersion.prompt_model_uuid == prompt_model_uuid)
                    .order_by(asc(PromptModelVersion.version))
                )
            )
            .scalars()
            .all()
        ]
        return prompt_model_versions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{uuid}")
async def fetch_prompt_model_version(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_model_version: Dict = (
            (
                await session.execute(
                    select(PromptModelVersion).where(PromptModelVersion.uuid == uuid)
                )
            )
            .scalar_one()
            .model_dump()
        )
        return prompt_model_version
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class UpdatePublishedPromptModelVersionBody(BaseModel):
    project_uuid: str
    project_version: int
    previous_published_version_uuid: Optional[str] = None


@router.post("/{uuid}/publish/")
async def update_published_prompt_model_version(
    uuid: str,
    body: UpdatePublishedPromptModelVersionBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        if body.previous_published_version_uuid:
            await session.execute(
                update(PromptModelVersion)
                .where(PromptModelVersion.uuid == body.previous_published_version_uuid)
                .values(published=False)
            )

        await session.execute(
            update(PromptModelVersion)
            .where(PromptModelVersion.uuid == uuid)
            .values(published=True)
        )
        await session.execute(
            update(Project)
            .where(Project.uuid == body.project_uuid)
            .values(version=body.project_version + 1)
        )

        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/tags/")
async def update_prompt_model_version_tags(
    uuid: str,
    tags: List[str],
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(PromptModelVersion)
            .where(PromptModelVersion.uuid == uuid)
            .values(tags=tags)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/memo/")
async def update_prompt_model_version_memo(
    uuid: str,
    memo: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(PromptModelVersion)
            .where(PromptModelVersion.uuid == uuid)
            .values(memo=memo)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
