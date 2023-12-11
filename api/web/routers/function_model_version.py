"""APIs for FunctionModelVersion"""
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
from ..models import (
    FunctionModelVersionInstance,
    UpdatePublishedFunctionModelVersionBody,
    UpdateFunctionModelVersionTagsBody,
)

router = APIRouter()


# FunctionModelVersion Endpoints
@router.get("/", response_model=List[FunctionModelVersionInstance])
async def fetch_function_model_versions(
    function_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        function_model_versions: List[FunctionModelVersionInstance] = [
            FunctionModelVersionInstance(**function_model_version.model_dump())
            for function_model_version in (
                await session.execute(
                    select(FunctionModelVersion)
                    .where(
                        FunctionModelVersion.function_model_uuid == function_model_uuid
                    )
                    .order_by(asc(FunctionModelVersion.version))
                )
            )
            .scalars()
            .all()
        ]
        return function_model_versions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{uuid}", response_model=FunctionModelVersionInstance)
async def fetch_function_model_version(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        try:
            function_model_version: Dict = (
                (
                    await session.execute(
                        select(FunctionModelVersion).where(
                            FunctionModelVersion.uuid == uuid
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
                detail="FunctionModelVersion with given id not found",
            )
        return FunctionModelVersionInstance(**function_model_version)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/{uuid}/publish/", response_model=FunctionModelVersionInstance)
async def update_published_function_model_version(
    uuid: str,
    body: UpdatePublishedFunctionModelVersionBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        if body.previous_published_version_uuid:
            await session.execute(
                update(FunctionModelVersion)
                .where(
                    FunctionModelVersion.uuid == body.previous_published_version_uuid
                )
                .values(is_published=False)
            )

        updated_function_model_version = (
            (
                await session.execute(
                    update(FunctionModelVersion)
                    .where(FunctionModelVersion.uuid == uuid)
                    .values(is_published=True)
                    .returning(FunctionModelVersion)
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
        return FunctionModelVersionInstance(**updated_function_model_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/tags/", response_model=FunctionModelVersionInstance)
async def update_function_model_version_tags(
    uuid: str,
    body: UpdateFunctionModelVersionTagsBody,
    session: AsyncSession = Depends(get_session),
):
    tags: Optional[List[str]] = body.tags
    try:
        if tags == []:
            tags = None
        updated_version = (
            (
                await session.execute(
                    update(FunctionModelVersion)
                    .where(FunctionModelVersion.uuid == uuid)
                    .values(tags=tags)
                    .returning(FunctionModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return FunctionModelVersionInstance(**updated_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/memo/", response_model=FunctionModelVersionInstance)
async def update_function_model_version_memo(
    uuid: str,
    memo: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        updated_version = (
            (
                await session.execute(
                    update(FunctionModelVersion)
                    .where(FunctionModelVersion.uuid == uuid)
                    .values(memo=memo)
                    .returning(FunctionModelVersion)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return FunctionModelVersionInstance(**updated_version)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
