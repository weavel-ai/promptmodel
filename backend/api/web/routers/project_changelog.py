"""APIs for ProjectChangelog"""
from datetime import datetime
from typing import Annotated, Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models.project_changelog import ProjectChangelogInstance

router = APIRouter()


# Changelog Endpoints
@router.get("", response_model=List[ProjectChangelogInstance])
async def fetch_changelogs(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    changelogs: List[ProjectChangelogInstance] = [
        ProjectChangelogInstance(**changelog.model_dump())
        for changelog in (
            await session.execute(
                select(ProjectChangelog)
                .where(ProjectChangelog.project_uuid == project_uuid)
                .order_by(desc(ProjectChangelog.created_at))
            )
        )
        .scalars()
        .all()
    ]
    return changelogs

