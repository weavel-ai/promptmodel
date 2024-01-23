from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, Depends

from utils.security import get_jwt
from base.database import get_session
from db_models import *
from ..models.project import ProjectInstance
from ..models.function_model import PublicOrganizationInstance, PublicFunctionModelInstance

router = APIRouter()

@router.get("/projects", response_model=List[ProjectInstance])
async def get_public_project(
    session: AsyncSession = Depends(get_session),
): 
    
    query = select(Project).where(Project.is_public == True)
    projects: List[ProjectInstance] = [
        ProjectInstance(**project.model_dump())
        for project in (await session.execute(query)).scalars().all()
    ]
    
    return projects

@router.get("/function_models", response_model=List[PublicFunctionModelInstance])
async def get_public_function_models(
    page: int = 1,
    rows_per_page: int = 10,
    session: AsyncSession = Depends(get_session),
): 
    
    function_models: List[PublicFunctionModelInstance] = [
        PublicFunctionModelInstance(
            **function_model.model_dump(),
            project_name=project_name,
            project_description=project_description,
            organization=PublicOrganizationInstance(name=organization_name, slug=organization_slug)
        )
        for function_model, project_name, project_description, organization_name, organization_slug in (
            await session.execute(
                select(
                    FunctionModel,
                    Project.name.label('project_name'),
                    Project.description.label('project_description'),
                    Organization.name.label('organization_name'),
                    Organization.slug.label('organization_slug')
                )
                .join(Project, FunctionModel.project_uuid == Project.uuid)
                .join(Organization, Project.organization_id == Organization.organization_id)
                .where(Project.is_public == True)
                .order_by(desc(FunctionModel.created_at))
                .offset(max(0, (page - 1) * rows_per_page))
                .limit(rows_per_page)
            )
        )

    ]
    
    return function_models