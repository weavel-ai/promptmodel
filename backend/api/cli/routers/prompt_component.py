"""APIs for Component Logging"""
from uuid import uuid4

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update
from sqlalchemy.dialects.postgresql import insert

from fastapi import (
    APIRouter,
    Response,
    HTTPException,
    WebSocket,
    Depends,
)
from fastapi.responses import JSONResponse
from starlette import status as status_code

from utils.security import get_api_key, get_project, get_cli_user_id, get_project_cli_access_key
from api.dependency import get_websocket_token
from utils.logger import logger

from base.database import get_session
from base.websocket_connection import websocket_manager
from crud import update_instances, pull_instances, save_instances
from db_models import *
from modules.types import InstanceType
from litellm.utils import completion_cost, token_counter
from ..models import *
from api.common.models.prompt_component import (
    CreatePromptComponentVersionBody,
    CreateComponentLogBody,
    CreateComponentLogResponse,
    ConnectComponentRunLogBody,
    ScoreComponentRunLogBody,
)

router = APIRouter()

@router.post("")
async def create_prompt_component_version(
    body: CreatePromptComponentVersionBody,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    # check if prompt_component with name exists
    component: PromptComponent = (
        await session.execute(
            select(PromptComponent)
            .where(
                PromptComponent.project_uuid == project["uuid"]
            ).where(PromptComponent.name == body.name)
        )
    ).scalar_one_or_none()
    
    if not component:
        # create
        session.add(
            PromptComponent(
                name=body.name,
                project_uuid=project["uuid"],
            )
        )
        await session.commit()
        await session.refresh(component)
    
    # check version exist
    version: PromptComponentVersion = (
        await session.execute(
            select(PromptComponentVersion)
            .where(
                PromptComponentVersion.prompt_component_uuid == component.uuid
            ).where(PromptComponentVersion.version == body.version)
        )
    ).scalar_one_or_none()
    
    if not version:
        # create
        session.add(
            PromptComponentVersion(
                version=body.version,
                prompt_component_uuid=component.uuid,
            )
        )
        await session.commit()
        await session.refresh(version)
    
    return Response(status_code=status_code.HTTP_200_OK)

@router.post("/log", response_model=CreateComponentLogResponse)
async def create_component_log(
    body: CreateComponentLogBody,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    # check if prompt_component with name exists
    component: PromptComponent = (
        await session.execute(
            select(PromptComponent)
            .where(
                PromptComponent.project_uuid == project["uuid"]
            ).where(PromptComponent.name == body.name)
        )
    ).scalar_one_or_none()
    if not component:
        # create
        component = PromptComponent(
            name=body.name,
            project_uuid=project["uuid"],
        )
        session.add(component)
        await session.commit()
        await session.refresh(component)
    
    # check version exist
    version: PromptComponentVersion = (
        await session.execute(
            select(PromptComponentVersion)
            .where(
                PromptComponentVersion.prompt_component_uuid == component.uuid
            ).where(PromptComponentVersion.version == body.version)
        )
    ).scalar_one_or_none()
    
    if not version:
        # create
        version = PromptComponentVersion(
            version=body.version,
            prompt_component_uuid=component.uuid,
        )
        session.add(version)
        await session.commit()
        await session.refresh(version)

    # create log
    log = ComponentLog(
        version_uuid=version.uuid,
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)
    
    return CreateComponentLogResponse(uuid=log.uuid)


@router.post("/connect")
async def connect_component_log_run_log(
    body: ConnectComponentRunLogBody,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    component_log: ComponentLog = (
        await session.execute(
            select(ComponentLog).where(ComponentLog.uuid == body.component_log_uuid)
        )
    ).scalar_one_or_none()
    if not component_log:
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail=f"ComponentLog not found for uuid {body.component_log_uuid}",
        )
    
    run_log: RunLog = (
        await session.execute(
            select(RunLog).where(RunLog.uuid == body.run_log_uuid)
        )
    ).scalar_one_or_none()
    
    if not run_log:
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail=f"RunLog not found for uuid {body.run_log_uuid}",
        )
    
    relationship = ComponentLogRunLog(
        component_log_uuid=component_log.uuid,
        run_log_uuid=run_log.uuid,
    )
    session.add(relationship)
    await session.commit()
    
    return Response(status_code=status_code.HTTP_200_OK)


@router.post("/score")
async def save_component_log_score(
    body: ScoreComponentRunLogBody,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    component_log: ComponentLog = (
        await session.execute(
            select(ComponentLog).where(ComponentLog.uuid == body.component_log_uuid)
        )
    ).scalar_one_or_none()
    
    if not component_log:
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail=f"ComponentLog not found for uuid {body.component_log_uuid}",
        )

    # update run_log_score in original_value
    score_name_list = list(body.scores.keys())

    try: # try 2 times with try-except because of eval_metric uniqueness constraint
        score_list_in_db: List[EvalMetric] = (
            await session.execute(
                select(EvalMetric)
                .where(
                    EvalMetric.project_uuid == project["uuid"]
                )
                .where(EvalMetric.function_model_uuid is None)
                .where(EvalMetric.chat_model_uuid is None)
            )
        ).scalars().all()
        
        score_name_list_in_db = [x.name for x in score_list_in_db]
        # find score_name_list not in db
        eval_metric_to_add = [
            EvalMetric(
                name=x,
                project_uuid=project["uuid"],
            )
            for x in score_name_list
            if x not in score_name_list_in_db
        ]
        if len(eval_metric_to_add) > 0:
            session.add_all(eval_metric_to_add)
            await session.commit()
    except:
        score_list_in_db: List[EvalMetric] = (
            await session.execute(
                select(EvalMetric)
                .where(
                    EvalMetric.project_uuid == project["uuid"]
                )
                .where(EvalMetric.function_model_uuid.is_(None))
                .where(EvalMetric.chat_model_uuid.is_(None))
            )
        ).scalars().all()
        
        score_name_list_in_db = [x.name for x in score_list_in_db]
        # find score_name_list not in db
        eval_metric_to_add = [
            EvalMetric(
                name=x,
                project_uuid=project["uuid"],
            )
            for x in score_name_list
            if x not in score_name_list_in_db
        ]
        if len(eval_metric_to_add) > 0:
            session.add_all(eval_metric_to_add)
            await session.commit()
        
    eval_metric_to_use: List[EvalMetric] = (
        (
            await session.execute(
                select(EvalMetric)
                .where(EvalMetric.project_uuid == project["uuid"])
                .where(EvalMetric.function_model_uuid.is_(None))
                .where(EvalMetric.chat_model_uuid.is_(None))
                .where(EvalMetric.name.in_(score_name_list))
            )
        )
        .scalars()
        .all()
    )

    eval_metric_dict = {x.name: x.uuid for x in eval_metric_to_use}

    scores_to_add: List[ComponentLogScore] = []
    for key, value in body.scores.items():
        scores_to_add.append(
            ComponentLogScore(
                component_log_uuid=body.component_log_uuid,
                eval_metric_uuid=eval_metric_dict[key],
                value=value,
            )
        )

    for score in scores_to_add:
        (
            await session.execute(
                insert(ComponentLogScore)
                .values(
                    component_log_uuid=score.component_log_uuid,
                    eval_metric_uuid=score.eval_metric_uuid,
                    value=score.value,
                )
                .on_conflict_do_update(  # if conflict, append
                    index_elements=[
                        ComponentLogScore.component_log_uuid,
                        ComponentLogScore.eval_metric_uuid,
                    ],
                    set_={"value": score.value},
                )
            )
        )

    await session.commit()

    return Response(status_code=status_code.HTTP_200_OK)
