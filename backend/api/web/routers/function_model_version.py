"""APIs for FunctionModelVersion"""
from typing import Annotated, Dict, List, Optional
from threading import Thread
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, update

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models import (
    FunctionModelVersionInstance,
    UpdatePublishedFunctionModelVersionBody,
    UpdateFunctionModelVersionTagsBody,
    BatchRunConfigBody,
    DatasetBatchRunInstance,
)

router = APIRouter()


# FunctionModelVersion Endpoints
@router.get("", response_model=List[FunctionModelVersionInstance])
async def fetch_function_model_versions(
    jwt: Annotated[str, Depends(get_jwt)],
    function_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
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
    


@router.get("/{uuid}", response_model=FunctionModelVersionInstance)
async def fetch_function_model_version(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
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



@router.post("/{uuid}/publish", response_model=FunctionModelVersionInstance)
async def update_published_function_model_version(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    body: UpdatePublishedFunctionModelVersionBody,
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



@router.patch("/{uuid}/tags", response_model=FunctionModelVersionInstance)
async def update_function_model_version_tags(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    body: UpdateFunctionModelVersionTagsBody,
    session: AsyncSession = Depends(get_session),
):
    tags: Optional[List[str]] = body.tags
    
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



@router.patch("/{uuid}/memo", response_model=FunctionModelVersionInstance)
async def update_function_model_version_memo(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    memo: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
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



@router.post("/{uuid}/batch_run")
async def batch_run(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    body: BatchRunConfigBody,
    session: AsyncSession = Depends(get_session),
):
    # create batch_run
    new_batch_run = BatchRun(
        dataset_uuid=body.dataset_uuid,
        function_model_version_uuid=uuid,
    )
    session.add(new_batch_run)
    await session.commit()
    await session.refresh(new_batch_run)

    # TODO: run background task as thread

    


@router.get("/{uuid}/batch_run")
async def fetch_batch_runs(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    function_model_uuid = (
        await session.execute(
            select(FunctionModelVersion.function_model_uuid).where(
                FunctionModelVersion.uuid == uuid
            )
        )
    ).scalar_one()

    # fetch dataset for FunctionModel
    dataset_list: List[Dataset] = (
        (
            await session.execute(
                select(Dataset).where(
                    Dataset.function_model_uuid == function_model_uuid
                )
            )
        )
        .scalars()
        .all()
    )

    # fetch BatchRun
    batch_runs: List[BatchRun] = (
        (
            await session.execute(
                select(BatchRun).where(BatchRun.function_model_version_uuid == uuid)
            )
        )
        .scalars()
        .all()
    )

    # TODO: make response
    res: List[DatasetBatchRunInstance] = []
    for dataset in dataset_list:
        batch_run_for_dataset = [
            batch_run
            for batch_run in batch_runs
            if batch_run.dataset_uuid == dataset.uuid
        ]
        if len(batch_run_for_dataset) == 0:
            batch_run_for_dataset = None
        else:
            batch_run_for_dataset = batch_run_for_dataset[0]

        res.append(
            DatasetBatchRunInstance(
                dataset_uuid=dataset.uuid,
                dataset_name=dataset.name,
                batch_run_uuid=batch_run_for_dataset.uuid
                if batch_run_for_dataset
                else None,
                batch_run_score=batch_run_for_dataset.score
                if batch_run_for_dataset
                else None,
                batch_run_status=batch_run_for_dataset.status
                if batch_run_for_dataset
                else None,
            )
        )

    return res