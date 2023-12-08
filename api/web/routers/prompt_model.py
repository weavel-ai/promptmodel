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


# PromptModel Endpoints
@router.get("/")
async def fetch_prompt_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_models: List[Dict] = [
            prompt_model.model_dump()
            for prompt_model in (
                await session.execute(
                    select(PromptModel)
                    .where(PromptModel.project_uuid == project_uuid)
                    .order_by(desc(PromptModel.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return prompt_models
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class CreatePromptModelBody(BaseModel):
    name: str
    project_uuid: str


@router.post("/")
async def create_prompt_model(
    body: CreatePromptModelBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check same name
        prompt_model_in_db = (
            await session.execute(
                select(PromptModel)
                .where(PromptModel.name == body.name)
                .where(PromptModel.project_uuid == body.project_uuid)
            )
        ).scalar_one_or_none()
        if prompt_model_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )
        new_prompt_model = PromptModel(name=body.name, project_uuid=body.project_uuid)
        session.add(new_prompt_model)
        await session.commit()
        await session.refresh(new_prompt_model)
        return new_prompt_model.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/")
async def edit_prompt_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(PromptModel).where(PromptModel.uuid == uuid).values(name=name)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/{uuid}")
async def delete_prompt_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(delete(PromptModel).where(PromptModel.uuid == uuid))
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
