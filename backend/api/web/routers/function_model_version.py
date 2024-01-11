"""APIs for FunctionModelVersion"""
from typing import Annotated, Dict, List, Optional
from threading import Thread
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models.function_model_version import (
    FunctionModelVersionInstance,
    CreateFunctionModelVersionBody,
    UpdatePublishedFunctionModelVersionBody,
    UpdateFunctionModelVersionTagsBody,
    FunctionModelVersionBatchRunInstance,
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
                .where(FunctionModelVersion.function_model_uuid == function_model_uuid)
                .order_by(asc(FunctionModelVersion.version))
            )
        )
        .scalars()
        .all()
    ]
    return function_model_versions


@router.post("")
async def create_function_model_version(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateFunctionModelVersionBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # last version
        last_version: int = (
            await session.execute(
                select(FunctionModelVersion.version)
                .where(
                    FunctionModelVersion.function_model_uuid == body.function_model_uuid
                )
                .order_by(desc(FunctionModelVersion.version))
                .limit(1)
            )
        ).scalar_one_or_none()
        if not last_version:
            last_version = 0

        function_model_version = FunctionModelVersion(
            version=last_version + 1,
            model=body.model,
            is_published=False if body.from_version else True,
            from_version=body.from_version,
            parsing_type=body.parsing_type,
            output_keys=body.output_keys,
            functions=body.functions,
            function_model_uuid=body.function_model_uuid,
        )
        session.add(function_model_version)
        await session.flush()
        await session.refresh(function_model_version)

        # create prompts
        prompts = [
            Prompt(
                role=prompt.role,
                step=prompt.step,
                content=prompt.content,
                version_uuid=function_model_version.uuid,
            )
            for prompt in body.prompts
        ]
        session.add_all(prompts)
        await session.flush()

        changelogs = []
        changelogs.append(
            {
                "subject": "function_model_version",
                "identifier": [str(function_model_version.uuid)],
                "action": "ADD",
            }
        )
        if last_version == 0:
            changelogs.append(
                {
                    "subject": "function_model_version",
                    "identifier": [str(function_model_version.uuid)],
                    "action": "PUBLISH",
                }
            )
        session.add(
            ProjectChangelog(
                **{
                    "logs": changelogs,
                    "project_uuid": body.project_uuid,
                }
            )
        )
        await session.flush()

        if last_version == 0:
            project_version = (
                await session.execute(
                    select(Project.version).where(Project.uuid == body.project_uuid)
                )
            ).scalar_one()

            await session.execute(
                update(Project)
                .where(Project.uuid == body.project_uuid)
                .values(version=project_version + 1)
            )
            await session.flush()

        await session.commit()

    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=status_code.HTTP_400_BAD_REQUEST,
            detail="Failed to create FunctionModelVersion",
        )

    return function_model_version


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
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail="FunctionModelVersion with given id not found",
        )
    return FunctionModelVersionInstance(**function_model_version)


@router.delete("/{uuid}")
async def delete_function_model_version(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    # check if user has access to the function_model
    function_model_version_to_delete: FunctionModelVersion = (
        await session.execute(
            select(FunctionModelVersion).where(FunctionModelVersion.uuid == uuid)
        )
    ).scalar_one_or_none()

    if not function_model_version_to_delete:
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail="FunctionModelVersion with given id not found",
        )

    if function_model_version_to_delete.is_published == True:
        raise HTTPException(
            status_code=status_code.HTTP_400_BAD_REQUEST,
            detail="Cannot delete published version",
        )

    function_model_version_int = function_model_version_to_delete.version
    parent_node_version = function_model_version_to_delete.from_version

    # update child nodes
    (
        await session.execute(
            update(FunctionModelVersion)
            .values(from_version=parent_node_version)
            .where(
                FunctionModelVersion.function_model_uuid
                == function_model_version_to_delete.function_model_uuid
            )
            .where(FunctionModelVersion.from_version == function_model_version_int)
        )
    )
    await session.flush()

    # delete function_model_version
    (
        await session.execute(
            delete(FunctionModelVersion).where(FunctionModelVersion.uuid == uuid)
        )
    )
    await session.commit()

    # return List of FunctionModelVersions

    function_model_versions: List[FunctionModelVersionInstance] = [
        FunctionModelVersionInstance(**function_model_version.model_dump())
        for function_model_version in (
            await session.execute(
                select(FunctionModelVersion)
                .where(
                    FunctionModelVersion.function_model_uuid
                    == function_model_version_to_delete.function_model_uuid
                )
                .order_by(asc(FunctionModelVersion.version))
            )
        )
        .scalars()
        .all()
    ]
    return function_model_versions


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
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

    if body.previous_published_version_uuid:
        await session.execute(
            update(FunctionModelVersion)
            .where(FunctionModelVersion.uuid == body.previous_published_version_uuid)
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


@router.get(
    "/{uuid}/batch_runs", response_model=List[FunctionModelVersionBatchRunInstance]
)
async def fetch_batch_runs(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
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

    return [
        FunctionModelVersionBatchRunInstance(**batch_run.model_dump())
        for batch_run in batch_runs
    ]
