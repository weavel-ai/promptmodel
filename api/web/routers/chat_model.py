"""APIs for ChatModel"""
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import ChatModelInstance, CreateChatModelBody

router = APIRouter()


# ChatModel Endpoints
@router.get("/", response_model=List[ChatModelInstance])
async def fetch_chat_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_models: List[ChatModelInstance] = [
            ChatModelInstance(**chat_model.model_dump())
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


@router.post("/", response_model=ChatModelInstance)
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
        return ChatModelInstance(**new_chat_model.model_dump())
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/", response_model=ChatModelInstance)
async def edit_chat_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        updated_chat_model = (
            (
                await session.execute(
                    update(ChatModel)
                    .where(ChatModel.uuid == uuid)
                    .values(name=name)
                    .returning(ChatModel)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return ChatModelInstance(**updated_chat_model)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/{uuid}", response_model=ChatModelInstance)
async def delete_chat_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        deleted_chat_model = (
            (
                await session.execute(
                    delete(ChatModel).where(ChatModel.uuid == uuid).returning(ChatModel)
                )
            )
            .scalar_one()
            .model_dump()
        )

        await session.commit()
        return ChatModelInstance(**deleted_chat_model)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
