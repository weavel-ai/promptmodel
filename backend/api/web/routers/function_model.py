"""APIs for FunctionModel"""
from datetime import datetime
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_403_FORBIDDEN,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models import FunctionModelInstance, CreateFunctionModelBody, DatasetInstance

router = APIRouter()


# FunctionModel Endpoints
@router.get("", response_model=List[FunctionModelInstance])
async def fetch_function_models(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
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



@router.post("", response_model=FunctionModelInstance)
async def create_function_model(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateFunctionModelBody,
    session: AsyncSession = Depends(get_session),
):
    user_auth_check = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == body.project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

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



@router.patch("/{uuid}", response_model=FunctionModelInstance)
async def edit_function_model_name(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
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



@router.delete("/{uuid}", response_model=FunctionModelInstance)
async def delete_function_model(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    # TODO
    user_auth_check = (
        await session.execute(
            select(FunctionModel)
            .join(Project, FunctionModel.project_uuid == Project.uuid)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(FunctionModel.uuid == uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

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
    


@router.get("/{uuid}/datasets")
async def fetch_datasets(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    datasets: List[DatasetInstance] = [
        DatasetInstance(**d.model_dump())
        for d in (
            await session.execute(
                select(Dataset)
                .join(
                    FunctionModel, Dataset.function_model_uuid == FunctionModel.uuid
                )
                .where(FunctionModel.uuid == uuid)
            )
        )
        .scalars()
        .all()
    ]
    return datasets

