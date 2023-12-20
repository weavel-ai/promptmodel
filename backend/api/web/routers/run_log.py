"""APIs for RunLog"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import JWT
from db_models import *
from ..models import (
    RunLogInstance,
    DeploymentRunLogViewInstance,
    RunLogsCountInstance,
)

router = APIRouter()


# RunLog Endpoints


@router.get("/version", response_model=List[RunLogInstance])
async def fetch_version_run_logs(
    function_model_version_uuid: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        run_logs: List[RunLogInstance] = [
            RunLogInstance(**run_log.model_dump())
            for run_log in (
                await session.execute(
                    select(RunLog)
                    .where(RunLog.version_uuid == function_model_version_uuid)
                    .order_by(desc(RunLog.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return run_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project", response_model=List[DeploymentRunLogViewInstance])
async def fetch_run_logs(
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        run_logs: List[DeploymentRunLogViewInstance] = [
            DeploymentRunLogViewInstance(**run_log.model_dump())
            for run_log in (
                await session.execute(
                    select(DeploymentRunLogView)
                    .where(DeploymentRunLogView.project_uuid == project_uuid)
                    .order_by(desc(DeploymentRunLogView.created_at))
                    .offset((page - 1) * rows_per_page)
                    .limit(rows_per_page)
                )
            )
            .scalars()
            .all()
        ]
        return run_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/count", response_model=RunLogsCountInstance)
async def fetch_run_logs_count(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        try:
            run_logs_count: int = (
                await session.execute(
                    select(RunLogsCount.run_logs_count).where(
                        RunLogsCount.project_uuid == project_uuid
                    )
                )
            ).scalar_one()
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="RunLogsCount with given id not found",
            )

        return RunLogsCountInstance(project_uuid=project_uuid, count=run_logs_count)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
