"""APIs for Project Table"""
import secrets
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger
from utils.security import get_jwt
from base.database import get_session
from db_models import *
from ..models import ProjectInstance, CreateProjectBody

router = APIRouter()


# Project Endpoints
@router.post("", response_model=ProjectInstance)
async def create_project(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateProjectBody,
    session: AsyncSession = Depends(get_session),
):
        # check same name
        project_in_db = (
            await session.execute(
                select(Project)
                .where(Project.name == body.name)
                .where(Project.organization_id == body.organization_id)
            )
        ).scalar_one_or_none()

        if project_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Project with given name already exists",
            )

        api_key = secrets.token_urlsafe(32)
        new_project = Project(
            name=body.name,
            organization_id=body.organization_id,
            description=body.description,
            api_key=api_key,
        )
        session.add(new_project)
        await session.flush()
        await session.refresh(new_project)

        accuracy = EvalMetric(
            project_uuid=new_project.uuid,
            name="gt_exact_match",
            description="default metric, exact match with ground truth",
            extent=[0, 1],
        )
        session.add(accuracy)
        await session.commit()

        return ProjectInstance(**new_project.model_dump())
    


@router.get("", response_model=List[ProjectInstance])
async def fetch_projects(
    jwt: Annotated[str, Depends(get_jwt)],
    organization_id: str,
    session: AsyncSession = Depends(get_session),
):
    check_user_auth = (
        await session.execute(
            select(UsersOrganizations)
            .where(UsersOrganizations.user_id == jwt["user_id"])
            .where(UsersOrganizations.organization_id == organization_id)
        )
    ).scalar_one_or_none()

    if not check_user_auth:
        raise HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="User don't have access to this organization",
        )

    projects: List[ProjectInstance] = [
        ProjectInstance(**project.model_dump())
        for project in (
            await session.execute(
                select(Project).where(Project.organization_id == organization_id)
            )
        )
        .scalars()
        .all()
    ]
    return projects



@router.get("/{uuid}", response_model=ProjectInstance)
async def get_project(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
        try:
            project: Dict = (
                (await session.execute(select(Project).where(Project.uuid == uuid)))
                .scalar_one()
                .model_dump()
            )
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="Project with given uuid not found",
            )
        return ProjectInstance(**project)
    
