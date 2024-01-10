"""APIs for RunLog"""
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models.run_log import (
    RunLogInstance,
    RunLogWithScoreInstance,
    SaveRunLogBody,
    DeploymentRunLogViewInstance,
    RunLogsCountInstance,
)

router = APIRouter()


# RunLog Endpoints


@router.get("/version", response_model=List[RunLogInstance])
async def fetch_version_run_logs(
    jwt: Annotated[str, Depends(get_jwt)],
    function_model_version_uuid: str,
    session: AsyncSession = Depends(get_session),
):
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


@router.post(
    "/version/{function_model_version_uuid}", response_model=List[RunLogInstance]
)
async def save_run_logs(
    jwt: Annotated[str, Depends(get_jwt)],
    function_model_version_uuid: str,
    body_list: List[SaveRunLogBody],
    session: AsyncSession = Depends(get_session),
):
    version_to_add: FunctionModelVersion = (
        await session.execute(
            select(FunctionModelVersion).where(
                FunctionModelVersion.uuid == function_model_version_uuid
            )
        )
    ).scalar_one()

    project_uuid: str = (
        await session.execute(
            select(FunctionModel.project_uuid).where(
                FunctionModel.uuid == version_to_add.function_model_uuid
            )
        )
    ).scalar_one()

    run_logs = [
        RunLog(
            **{
                **body.model_dump(),
                "version_uuid": function_model_version_uuid,
                "project_uuid": project_uuid,
                "run_from_deployment": False,
            }
        )
        for body in body_list
    ]
    session.add_all(run_logs)
    await session.commit()

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


@router.get("/project", response_model=List[DeploymentRunLogViewInstance])
async def fetch_run_logs(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
):
    check_user_auth = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not check_user_auth:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

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


@router.get("/batch_run", response_model=List[RunLogWithScoreInstance])
async def fetch_run_log_in_batch_run(
    jwt: Annotated[str, Depends(get_jwt)],
    batch_run_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    # run_log_with_scores: List[RunLogWithScoreInstance] = [
    #     RunLogWithScoreInstance(**run_log.model_dump())
    #     for run_log in (
    #         await session.execute(
    #             select(
    #                 RunLog,
    #                 RunLogScore.value.label("score"),
    #                 EvalMetric.name.label("eval_metric_name"),
    #                 EvalMetric.uuid.label("eval_metric_uuid"),
    #             )
    #             .join(RunLogScore, RunLog.uuid == RunLogScore.run_log_uuid)
    #             .join(EvalMetric, RunLogScore.eval_metric_uuid == EvalMetric.uuid)
    #             .where(RunLog.batch_run_uuid == batch_run_uuid)
    #             .order_by(desc(RunLog.created_at))
    #         )
    #     )
    #     .scalars()
    #     .all()
    # ]
    run_log_with_scores: List[RunLogWithScoreInstance] = [
        RunLogWithScoreInstance(
            **run_log_model.model_dump(),
            score=score,
            eval_metric_name=eval_metric_name,
            eval_metric_uuid=eval_metric_uuid
        )
        for run_log_model, score, eval_metric_name, eval_metric_uuid in (
            await session.execute(
                select(
                    RunLog,
                    RunLogScore.value.label("score"),
                    EvalMetric.name.label("eval_metric_name"),
                    EvalMetric.uuid.label("eval_metric_uuid"),
                )
                .join(RunLogScore, RunLog.uuid == RunLogScore.run_log_uuid)
                .join(EvalMetric, RunLogScore.eval_metric_uuid == EvalMetric.uuid)
                .where(RunLog.batch_run_uuid == batch_run_uuid)
                .order_by(desc(RunLog.created_at))
            )
        ).all()
    ]

    return run_log_with_scores


@router.get("/count", response_model=RunLogsCountInstance)
async def fetch_run_logs_count(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
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
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail="RunLogsCount with given id not found",
        )

    return RunLogsCountInstance(project_uuid=project_uuid, count=run_logs_count)
