"""APIs for PromptModel"""
from datetime import datetime
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
from modules.types import PMObject
from db_models import *
from ..models import PromptModelInstance, CreatePromptModelBody

router = APIRouter()


# PromptModel Endpoints
@router.get("/", response_model=List[PromptModelInstance])
async def fetch_prompt_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_models: List[PromptModelInstance] = [
            PromptModelInstance(**prompt_model.model_dump())
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


@router.post("/", response_model=PromptModelInstance)
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
        return PromptModelInstance(**new_prompt_model.model_dump())
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/", response_model=PromptModelInstance)
async def edit_prompt_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        updated_model = (
            (
                await session.execute(
                    update(PromptModel)
                    .where(PromptModel.uuid == uuid)
                    .values(name=name)
                    .returning(PromptModel)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return PromptModelInstance(**updated_model)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/{uuid}", response_model=PromptModelInstance)
async def delete_prompt_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        deleted_model = (
            (
                await session.execute(
                    delete(PromptModel)
                    .where(PromptModel.uuid == uuid)
                    .returning(PromptModel)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return PromptModelInstance(**deleted_model)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
