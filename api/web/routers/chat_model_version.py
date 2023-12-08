"""APIs for ChatModelVersion"""
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, update

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)


from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import ChatModelVersionInstance, UpdatePublishedChatModelVersionBody

router = APIRouter()


# ChatModelVersion Endpoints
@router.get("/", response_model=List[ChatModelVersionInstance])
async def fetch_chat_model_versions(
    chat_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_model_versions: List[ChatModelVersionInstance] = [
            ChatModelVersionInstance(**chat_model_version.model_dump())
            for chat_model_version in (
                await session.execute(
                    select(ChatModelVersion)
                    .where(ChatModelVersion.chat_model_uuid == chat_model_uuid)
                    .order_by(asc(ChatModelVersion.version))
                )
            )
            .scalars()
            .all()
        ]
        return chat_model_versions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{uuid}", response_model=ChatModelVersionInstance)
async def fetch_chat_model_version(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        try:
            chat_model_version: Dict = (
                (
                    await session.execute(
                        select(ChatModelVersion).where(ChatModelVersion.uuid == uuid)
                    )
                )
                .scalar_one()
                .model_dump()
            )
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="ChatModelVersion with given id not found",
            )
        return ChatModelVersionInstance(**chat_model_version)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/{uuid}/publish/")
async def update_published_chat_model_version(
    uuid: str,
    body: UpdatePublishedChatModelVersionBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        if body.previous_published_version_uuid:
            await session.execute(
                update(ChatModelVersion)
                .where(ChatModelVersion.uuid == body.previous_published_version_uuid)
                .values(is_published=False)
            )

        updated_chat_model_version = (
            (
                await session.execute(
                    update(ChatModelVersion)
                    .where(ChatModelVersion.uuid == uuid)
                    .values(is_published=True)
                    .returning(ChatModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        # TODO: add this to response
        updated_project = (
            (
                await session.execute(
                    update(Project)
                    .where(Project.uuid == body.project_uuid)
                    .values(version=body.project_version + 1)
                    .returning(Project)
                )
            )
            .scalar_one()
            .model_dump()
        )

        await session.commit()

        return ChatModelVersionInstance(**updated_chat_model_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/tags/", response_model=ChatModelVersionInstance)
async def update_chat_model_version_tags(
    uuid: str,
    tags: Optional[List[str]] = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        if tags == []:
            tags = None
        updated_chat_model_version = (
            (
                await session.execute(
                    update(ChatModelVersion)
                    .where(ChatModelVersion.uuid == uuid)
                    .values(tags=tags)
                    .returning(ChatModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return ChatModelVersionInstance(**updated_chat_model_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/memo/", response_model=ChatModelVersionInstance)
async def update_chat_model_version_memo(
    uuid: str,
    memo: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        updated_chat_model_version = (
            (
                await session.execute(
                    update(ChatModelVersion)
                    .where(ChatModelVersion.uuid == uuid)
                    .values(memo=memo)
                    .returning(ChatModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return ChatModelVersionInstance(**updated_chat_model_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
