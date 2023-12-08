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


# ChatModel Endpoints
@router.get("/")
async def fetch_chat_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_models: List[Dict] = [
            chat_model.model_dump()
            for chat_model in (
                await session.execute(
                    select(ChatModel)
                    .where(ChatModel.project_uuid == project_uuid)
                    .order_by(desc(ChatModel.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return chat_models
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class CreateChatModelBody(BaseModel):
    project_uuid: str
    name: str


@router.post("/")
async def create_chat_model(
    body: CreateChatModelBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check same name
        chat_model_in_db = (
            await session.execute(
                select(ChatModel)
                .where(ChatModel.name == body.name)
                .where(ChatModel.project_uuid == body.project_uuid)
            )
        ).scalar_one_or_none()
        if chat_model_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )
        new_chat_model = ChatModel(name=body.name, project_uuid=body.project_uuid)
        session.add(new_chat_model)
        await session.commit()
        await session.refresh(new_chat_model)
        return new_chat_model.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/")
async def edit_chat_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(ChatModel).where(ChatModel.uuid == uuid).values(name=name)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/{uuid}")
async def delete_chat_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(delete(ChatModel).where(ChatModel.uuid == uuid))
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
