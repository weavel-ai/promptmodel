"""APIs for PromptComponent"""
from datetime import datetime
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from api.common.models.prompt_component import (
    PromptComponentInstance,
    PromptComponentVersionInstance,
    ComponentLogInstance,
)

router = APIRouter()

@router.get("/project/{project_uuid}", response_model=List[PromptComponentInstance])
async def fetch_prompt_component_list(
    jwt: dict = Depends(get_jwt),
    project_uuid: str = None,
    session: AsyncSession = Depends(get_session),
):
    """Fetch list of prompt components"""
    component_list: List[PromptComponent] = (
        await session.execute(
            select(PromptComponent)
            .where(PromptComponent.project_uuid == project_uuid)
        )
    ).scalars().all()
    
    version_list: List[PromptComponentVersion] = (
        await session.execute(select(PromptComponentVersion).where(PromptComponentVersion.prompt_component_uuid.in_([component.uuid for component in component_list])))
    ).scalars().all()
    
    component_version_list = {}
    for version in version_list:
        if version.prompt_component_uuid not in component_version_list:
            component_version_list[version.prompt_component_uuid] = []
        component_version_list[version.prompt_component_uuid].append(version.uuid)
    
    res = [
        PromptComponentInstance(
            uuid=component.uuid,
            name=component.name,
            project_uuid=component.project_uuid,
            created_at=component.created_at,
            versions=component_version_list[component.uuid] if component.uuid in component_version_list else [],
        )
        for component in component_list
    ]
    
    return res

@router.get("/{component_uuid}/versions", response_model=List[PromptComponentVersionInstance])
async def fetch_prompt_component_versions(
    jwt: dict = Depends(get_jwt),
    component_uuid: str = None,
    session: AsyncSession = Depends(get_session),
):
    """Fetch List of prompt component versions"""
    version_list: List[PromptComponentVersionInstance] = [
        PromptComponentVersionInstance(**version.model_dump())
        for version in (
        await session.execute(
                select(PromptComponentVersion)
                .where(PromptComponentVersion.prompt_component_uuid == component_uuid)
            )
        ).scalars().all()
    ]
    
    return version_list


@router.get("/logs", response_model=List[ComponentLogInstance])
async def fetch_logs(
    jwt: dict = Depends(get_jwt),
    component_uuid: Optional[str] = None,
    version_uuid: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Fetch list of component logs"""
    log_query = select(ComponentLog)
    if not version_uuid and component_uuid:
        version_uuid_list: List[str] = (
            await session.execute(
                select(PromptComponentVersion.uuid)
                .where(PromptComponentVersion.prompt_component_uuid == component_uuid)
            )
        ).scalars().all()
        log_query = log_query.where(ComponentLog.version_uuid.in_(version_uuid_list))
    elif version_uuid:
        log_query = log_query.where(ComponentLog.version_uuid == version_uuid)
    
    log_list: List[ComponentLog] = (
        await session.execute(log_query)
    ).scalars().all()
    
    run_log_list: List[Dict] = (
        await session.execute(
            select(RunLog.label("run_log"), ComponentLogRunLog.component_log_uuid.label("component_log_uuid"))
            .join(ComponentLogRunLog, RunLog.uuid == ComponentLogRunLog.run_log_uuid)
            .where(ComponentLogRunLog.component_log_uuid.in_([log.uuid for log in log_list]))
        )
    ).mappings().all()
    
    run_log_per_component_log = {}
    for run_log in run_log_list:
        if run_log["component_log_uuid"] not in run_log_per_component_log:
            run_log_per_component_log[run_log["component_log_uuid"]] = []
        run_log_per_component_log[run_log["component_log_uuid"]].append(run_log["run_log"])
        
    scores: List[Dict] = (
        await session.execute(
            select(
                ComponentLogScore.label("component_log_score"),
                EvalMetric.name.label("eval_metric_name")
            )
            .where(ComponentLogScore.component_log_uuid.in_([log.uuid for log in log_list]))
        )
    ).mappings().all() 
    
    score_per_component_log = {}
    for score in scores:
        if score["component_log_uuid"] not in score_per_component_log:
            score_per_component_log[score["component_log_uuid"]] = {}
        score_per_component_log[score["component_log_uuid"]][score["eval_metric_name"]] = score["component_log_score"]
    
    res: List[ComponentLogInstance] = []
    for log in log_list:
        res.append(
            ComponentLogInstance(
                uuid=log.uuid,
                created_at=log.created_at,
                version_uuid=log.version_uuid,
                run_log_instance_list=run_log_per_component_log[log.uuid] if log.uuid in run_log_per_component_log else [],
                scores=score_per_component_log[log.uuid] if log.uuid in score_per_component_log else {},
            )
        )
    
    return log_list


