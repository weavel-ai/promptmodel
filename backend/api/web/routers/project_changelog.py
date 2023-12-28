"""APIs for ProjectChangelog"""
from datetime import datetime
from typing import Annotated, Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models import ProjectChangelogInstance

router = APIRouter()


# Changelog Endpoints
@router.get("", response_model=List[ProjectChangelogInstance])
async def fetch_changelogs(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
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
    except Exception as e:
        logger.error(e)
        try:
            logger.error(e.detail)
        except:
            pass
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
