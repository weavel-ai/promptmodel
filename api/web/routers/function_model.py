"""APIs for FunctionModel"""
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
from db_models import *
from ..models import FunctionModelInstance, CreateFunctionModelBody

router = APIRouter()


# FunctionModel Endpoints
@router.get("/", response_model=List[FunctionModelInstance])
async def fetch_function_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        function_models: List[FunctionModelInstance] = [
            FunctionModelInstance(**function_model.model_dump())
            for function_model in (
                await session.execute(
                    select(FunctionModel)
                    .where(FunctionModel.project_uuid == project_uuid)
                    .order_by(desc(FunctionModel.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return function_models
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/", response_model=FunctionModelInstance)
async def create_function_model(
    body: CreateFunctionModelBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check same name
        function_model_in_db = (
            await session.execute(
                select(FunctionModel)
                .where(FunctionModel.name == body.name)
                .where(FunctionModel.project_uuid == body.project_uuid)
            )
        ).scalar_one_or_none()
        if function_model_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )
        new_function_model = FunctionModel(
            name=body.name, project_uuid=body.project_uuid
        )
        session.add(new_function_model)
        await session.commit()
        await session.refresh(new_function_model)
        return FunctionModelInstance(**new_function_model.model_dump())
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{uuid}/", response_model=FunctionModelInstance)
async def edit_function_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        updated_model = (
            (
                await session.execute(
                    update(FunctionModel)
                    .where(FunctionModel.uuid == uuid)
                    .values(name=name)
                    .returning(FunctionModel)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return FunctionModelInstance(**updated_model)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/{uuid}", response_model=FunctionModelInstance)
async def delete_function_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        deleted_model = (
            (
                await session.execute(
                    delete(FunctionModel)
                    .where(FunctionModel.uuid == uuid)
                    .returning(FunctionModel)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return FunctionModelInstance(**deleted_model)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
