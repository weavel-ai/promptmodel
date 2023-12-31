"""APIs for Prompt"""
from datetime import datetime
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code
from utils.security import get_jwt

from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models.prompt import PromptInstance

router = APIRouter()
# Prompt Endpoint


@router.get("", response_model=List[PromptInstance])
async def fetch_prompts(
    jwt: Annotated[str, Depends(get_jwt)],
    function_model_version_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    check_user_auth = True
    # check_user_auth = (
    #     await session.execute(
    #         select(FunctionModel)
    #         .join(Project, FunctionModel.project_uuid == Project.uuid)
    #         .join(UsersOrganizations, Project.organization_id == UsersOrganizations.organization_id)
    #         .where(FunctionModel.version_uuid == function_model_version_uuid)
    #         .where(UsersOrganizations.user_id == jwt["user_id"])
    #     )
    # ).scalar_one_or_none()

    if not check_user_auth:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

    prompts: List[PromptInstance] = [
        PromptInstance(**prompt.model_dump())
        for prompt in (
            await session.execute(
                select(Prompt)
                .where(Prompt.version_uuid == function_model_version_uuid)
                .order_by(asc(Prompt.step))
            )
        )
        .scalars()
        .all()
    ]
    return prompts

