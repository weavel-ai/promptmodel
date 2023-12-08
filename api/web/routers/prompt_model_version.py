"""APIs for PromptModelVersion"""
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
from ..models import PromptModelVersionInstance, UpdatePublishedPromptModelVersionBody

router = APIRouter()


# PromptModelVersion Endpoints
@router.get("/", response_model=List[PromptModelVersionInstance])
async def fetch_prompt_model_versions(
    prompt_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_model_versions: List[PromptModelVersionInstance] = [
            PromptModelVersionInstance(**prompt_model_version.model_dump())
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


@router.get("/{uuid}", response_model=PromptModelVersionInstance)
async def fetch_prompt_model_version(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        try:
            prompt_model_version: Dict = (
                (
                    await session.execute(
                        select(PromptModelVersion).where(
                            PromptModelVersion.uuid == uuid
                        )
                    )
                )
                .scalar_one()
                .model_dump()
            )
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="PromptModelVersion with given id not found",
            )
        return PromptModelVersionInstance(**prompt_model_version)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/{uuid}/publish/", response_model=PromptModelVersionInstance)
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
                .values(is_published=False)
            )

        updated_prompt_model_version = (
            (
                await session.execute(
                    update(PromptModelVersion)
                    .where(PromptModelVersion.uuid == uuid)
                    .values(is_published=True)
                    .returning(PromptModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.execute(
            update(Project)
            .where(Project.uuid == body.project_uuid)
            .values(version=body.project_version + 1)
        )

        await session.commit()
        return PromptModelVersionInstance(**updated_prompt_model_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/tags/", response_model=PromptModelVersionInstance)
async def update_prompt_model_version_tags(
    uuid: str,
    tags: Optional[List[str]] = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        if tags == []:
            tags = None
        updated_version = (
            (
                await session.execute(
                    update(PromptModelVersion)
                    .where(PromptModelVersion.uuid == uuid)
                    .values(tags=tags)
                    .returning(PromptModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return PromptModelVersionInstance(**updated_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/memo/", response_model=PromptModelVersionInstance)
async def update_prompt_model_version_memo(
    uuid: str,
    memo: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        updated_version = (
            (
                await session.execute(
                    update(PromptModelVersion)
                    .where(PromptModelVersion.uuid == uuid)
                    .values(memo=memo)
                    .returning(PromptModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return PromptModelVersionInstance(**updated_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
