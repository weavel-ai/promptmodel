"""APIs for package management"""
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
from .unit_logger import router as unit_logger_router

router = APIRouter()
router.include_router(unit_logger_router, prefix="/unit")

@router.get("/cli_access/check", response_model=bool)
async def check_cli_access(
    api_key: str = Depends(get_api_key), session: AsyncSession = Depends(get_session)
):
    """Check if user has CLI access"""
    statement = select(CliAccess.user_id).where(CliAccess.api_key == api_key)
    result = await session.execute(statement)
    user_id = result.scalar_one_or_none()
    if not user_id:
        return False  # Response(status_code=status_code.HTTP_403_FORBIDDEN)
    return True  # Response(status_code=status_code.HTTP_200_OK)


@router.get("/organizations", response_model=List[UsersOrganizationsInstance])
async def list_orgs(
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """List user's organizations"""
    res = (
        (
            await session.execute(
                select(
                    UserOrganizations.organization_id,
                    UserOrganizations.name,
                    UserOrganizations.slug,
                ).where(UserOrganizations.user_id == user_id)
            )
        )
        .mappings()
        .all()
    )

    return res


@router.get("/projects", response_model=List[CliProjectInstance])
async def list_projects(
    organization_id: str,
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """List projects in organization"""
    res: Result = await session.execute(
        select(Project.uuid, Project.name, Project.description, Project.version).where(
            Project.organization_id == organization_id
        )
    )
    return [dict(x) for x in res.mappings().all()]


@router.get("/check_update")
async def check_update(
    cached_version: int,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    """
    Check version between local Cache and cloud,
    If local version is lower than cloud, return (True, New Version, project_status)
    Else return (False, New Version, None)

    Input:
        - cached_version: local cached version

    Return:
        - need_update: bool
        - version : int
        - project_status : dict
    """
    # get project version
    project_version: int = (
        await session.execute(
            select(Project.version).where(Project.uuid == project["uuid"])
        )
    ).scalar_one()

    # check if need update
    if project_version == cached_version:
        need_update = False
        res = {
            "need_update": need_update,
            "version": project_version,
            "project_status": None,
        }
        return JSONResponse(res, status_code=status_code.HTTP_200_OK)
    else:
        need_update = True

    # get current project status

    # get function_models
    function_models = (
        (
            await session.execute(
                select(FunctionModel.uuid, FunctionModel.name).where(
                    FunctionModel.project_uuid == project["uuid"]
                )
            )
        )
        .mappings()
        .all()
    )
    function_models = [
        DeployedFunctionModelInstance(**dict(x)).model_dump() for x in function_models
    ]

    # get published, ab_test function_model_versions
    deployed_function_model_versions: List[DeployedFunctionModelVersion] = (
        (
            await session.execute(
                select(DeployedFunctionModelVersion).where(
                    DeployedFunctionModelVersion.function_model_uuid.in_(
                        [str(x["uuid"]) for x in function_models]
                    )
                )
            )
        )
        .scalars()
        .all()
    )

    # filter out columns
    deployed_function_model_versions = [
        DeployedFunctionModelVersionInstance(**x.model_dump()).model_dump()
        for x in deployed_function_model_versions
    ]

    versions_uuid_list = [str(x["uuid"]) for x in deployed_function_model_versions]
    # get prompts
    prompts = (
        (
            await session.execute(
                select(
                    Prompt.version_uuid, Prompt.role, Prompt.step, Prompt.content
                ).where(Prompt.version_uuid.in_(versions_uuid_list))
            )
        )
        .mappings()
        .all()
    )
    prompts = [DeployedPromptInstance(**dict(x)).model_dump() for x in prompts]

    res = {
        "need_update": need_update,
        "version": project_version,
        "project_status": {
            "function_models": function_models,
            "function_model_versions": deployed_function_model_versions,
            "prompts": prompts,
        },
    }

    return JSONResponse(res, status_code=status_code.HTTP_200_OK)


@router.get(
    "/function_model_versions",
    response_model=List[FetchFunctionModelVersionResponseInstance],
)
async def fetch_function_model_version(
    function_model_name: str,
    version: Optional[Union[str, int]] = "deploy",
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    """
    Only use when use_cache = False.
    Find published version of function_model_version and prompt and return them.

    Input:
        - function_model_name: name of function_model

    Return:
        - function_model_versions : List[Dict]
        - prompts : List[Dict]
    """
    # find_function_model
    try:
        # find_function_model
        function_model_uuid = (
            await session.execute(
                select(FunctionModel.uuid)
                .where(FunctionModel.project_uuid == project["uuid"])
                .where(FunctionModel.name == function_model_name)
            )
        ).scalar_one_or_none()
        if not function_model_uuid:
            raise HTTPException(
                status_code=status_code.HTTP_400_BAD_REQUEST,
                detail=f"FunctionModel with name {function_model_name} not found",
            )
        if version == "deploy":
            # get published, ab_test function_model_versions
            deployed_function_model_versions = (
                (
                    await session.execute(
                        select(DeployedFunctionModelVersion).where(
                            DeployedFunctionModelVersion.function_model_uuid
                            == function_model_uuid
                        )
                    )
                )
                .scalars()
                .all()
            )
            if len(deployed_function_model_versions) == 0:
                raise HTTPException(
                    status_code=status_code.HTTP_400_BAD_REQUEST,
                    detail=f"No deployed version found for FunctionModel with name {function_model_name}",
                )
            deployed_function_model_versions = [
                DeployedFunctionModelVersionInstance(**x.model_dump()).model_dump()
                for x in deployed_function_model_versions
            ]
            versions_uuid_list = [
                str(x["uuid"]) for x in deployed_function_model_versions
            ]
            # get prompts
            prompts = (
                (
                    await session.execute(
                        select(
                            Prompt.version_uuid,
                            Prompt.role,
                            Prompt.step,
                            Prompt.content,
                        ).where(Prompt.version_uuid.in_(versions_uuid_list))
                    )
                )
                .mappings()
                .all()
            )
            # make list of {function_model_version, prompts} group by version_uuid
            config_list: List = []
            for version_uuid in versions_uuid_list:
                config = {
                    "function_model_version": [
                        x
                        for x in deployed_function_model_versions
                        if str(x["uuid"]) == version_uuid
                    ][0],
                    "prompts": [
                        DeployedPromptInstance(**dict(x)).model_dump()
                        for x in prompts
                        if str(x["version_uuid"]) == version_uuid
                    ],
                }
                config_list.append(config)
        else:
            try:
                version = int(version)
            except ValueError:
                version = version

            if isinstance(version, int):
                function_model_version: FunctionModelVersion = (
                    await session.execute(
                        select(FunctionModelVersion)
                        .where(
                            FunctionModelVersion.function_model_uuid
                            == function_model_uuid
                        )
                        .where(FunctionModelVersion.version == version)
                    )
                ).scalar_one_or_none()

                if not function_model_version:
                    raise HTTPException(
                        status_code=status_code.HTTP_400_BAD_REQUEST,
                        detail=f"Version {version} for FunctionModel {function_model_name} not found",
                    )

                function_model_version = DeployedFunctionModelVersionInstance(
                    **function_model_version.model_dump()
                ).model_dump()

            elif version == "latest":
                function_model_version = (
                    await session.execute(
                        select(FunctionModelVersion)
                        .where(
                            FunctionModelVersion.function_model_uuid
                            == function_model_uuid
                        )
                        .order_by(desc(FunctionModelVersion.version))
                        .limit(1)
                    )
                ).scalar_one_or_none()

                if not function_model_version:
                    raise HTTPException(
                        status_code=status_code.HTTP_400_BAD_REQUEST,
                        detail=f"Latest version for FunctionModel {function_model_name} not found",
                    )

                function_model_version = DeployedFunctionModelVersionInstance(
                    **function_model_version.model_dump()
                ).model_dump()

            # get prompts
            prompts = (
                (
                    await session.execute(
                        select(
                            Prompt.version_uuid,
                            Prompt.role,
                            Prompt.step,
                            Prompt.content,
                        ).where(Prompt.version_uuid == function_model_version["uuid"])
                    )
                )
                .mappings()
                .all()
            )
            prompts = [DeployedPromptInstance(**dict(x)).model_dump() for x in prompts]

            config_list = [
                {
                    "function_model_version": function_model_version,
                    "prompts": prompts,
                }
            ]

        res = [
            FetchFunctionModelVersionResponseInstance(**x).model_dump()
            for x in config_list
        ]

        return JSONResponse(res, status_code=status_code.HTTP_200_OK)
    except Exception as exc:
        raise HTTPException(
            status_code=status_code.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.get(
    "/chat_model_versions_with_logs",
    response_model=FetchChatModelVersionResponseInstance,
)
async def fetch_chat_model_version_with_chat_log(
    chat_model_name: str,
    session_uuid: Optional[str] = None,
    version: Optional[Union[str, int]] = "deploy",
    project: dict = Depends(get_project),
    db_session: AsyncSession = Depends(get_session),
):
    """
    ChatModel Always use this function when use_cache = True or False
    Find version of chat_model_version

    Input:
        - chat_model_name: name of chat_model
        - session_uuid: uuid of session
        - version

    Return:
        - Dict
            - chat_model_versions : List[Dict]
            -
    """
    try:
        version = int(version)
    except ValueError:
        version = version

    # find chat_model
    if session_uuid:
        # find session's chat_model & version
        try:
            session = (
                (
                    await db_session.execute(
                        select(ChatSession.version_uuid).where(
                            ChatSession.uuid == session_uuid
                        )
                    )
                )
                .one()
                ._mapping
            )
        except:
            raise HTTPException(
                status_code=status_code.HTTP_404_NOT_FOUND, detail="Session not found"
            )
        session_chat_model_version = (
            await db_session.execute(
                select(ChatModelVersion).where(
                    ChatModelVersion.uuid == session["version_uuid"]
                )
            )
        ).scalar_one_or_none()

        session_chat_model_version = [
            DeployedChatModelVersionInstance(
                **session_chat_model_version.model_dump()
            ).model_dump()
        ]

        # find chat logs
        chat_messages = (
            (
                await db_session.execute(
                    select(
                        ChatMessage.role,
                        ChatMessage.name,
                        ChatMessage.content,
                        ChatMessage.tool_calls,
                        ChatMessage.function_call,
                    )
                    .where(ChatMessage.session_uuid == session_uuid)
                    .order_by(asc(ChatMessage.created_at))
                )
            )
            .mappings()
            .all()
        )
        chat_messages = [dict(x) for x in chat_messages]

        res = {
            "chat_model_versions": session_chat_model_version,
            "chat_logs": chat_messages,
        }
    elif isinstance(version, int):
        # find chat_model_version
        try:
            chat_model = (
                (
                    await db_session.execute(
                        select(ChatModel.uuid, ChatModel.name)
                        .where(ChatModel.project_uuid == project["uuid"])
                        .where(ChatModel.name == chat_model_name)
                    )
                )
                .one()
                ._mapping
            )
        except:
            raise HTTPException(
                status_code=status_code.HTTP_404_NOT_FOUND,
                detail="Chat Model not found",
            )
        chat_model_version = (
            (
                await db_session.execute(
                    select(ChatModelVersion)
                    .where(ChatModelVersion.chat_model_uuid == chat_model["uuid"])
                    .where(ChatModelVersion.version == version)
                )
            )
            .scalars()
            .all()
        )

        chat_model_version = [
            DeployedChatModelVersionInstance(**x.model_dump()).model_dump()
            for x in chat_model_version
        ]

        res = {"chat_model_versions": chat_model_version, "chat_logs": []}
    else:
        # version == "deploy" or "latest"
        try:
            chat_model = (
                (
                    await db_session.execute(
                        select(ChatModel.uuid, ChatModel.name)
                        .where(ChatModel.project_uuid == project["uuid"])
                        .where(ChatModel.name == chat_model_name)
                    )
                )
                .one()
                ._mapping
            )
        except:
            raise HTTPException(
                status_code=status_code.HTTP_404_NOT_FOUND,
                detail="Chat Model not found",
            )

        if version == "deploy":
            # get published, ab_test chat_model_versions
            deployed_chat_model_versions = (
                (
                    await db_session.execute(
                        select(DeployedChatModelVersion).where(
                            DeployedChatModelVersion.chat_model_uuid
                            == chat_model["uuid"]
                        )
                    )
                )
                .scalars()
                .all()
            )  # it should be A/B testing

            deployed_chat_model_versions = [
                DeployedChatModelVersionInstance(**x.model_dump()).model_dump()
                for x in deployed_chat_model_versions
            ]

            res = {
                "chat_model_versions": deployed_chat_model_versions,
                "chat_logs": [],  # if in A/B tesing version selection, chat_logs cannot be existed.
            }

        else:
            # get latest chat_model_version

            latest_chat_model_versions = (
                await db_session.execute(
                    select(ChatModelVersion)
                    .where(ChatModelVersion.chat_model_uuid == chat_model["uuid"])
                    .order_by(desc(ChatModelVersion.version))
                    .limit(1)
                )
            ).scalar_one()

            latest_chat_model_versions = [
                DeployedChatModelVersionInstance(
                    **latest_chat_model_versions.model_dump()
                ).model_dump()
            ]

            res = {
                "chat_model_versions": latest_chat_model_versions,
                "chat_logs": [],
            }

    return JSONResponse(res, status_code=status_code.HTTP_200_OK)


# promptmodel library local websocket connection endpoint
@router.websocket("/open_websocket")
async def open_websocket(
    websocket: WebSocket,
    token: str = Depends(get_websocket_token),
):
    """Initializes a websocket connection with the local server."""
    # websocket_connection = await websocket_manager.connect(websocket, token)
    try:
        connection = await websocket_manager.connect(websocket, token)
        await connection
        # while True:
        #     # We can introduce a delay so this loop isn't running all the time.
        #     await asyncio.sleep(
        #         5
        #     )  # This is an arbitrary sleep value, adjust as needed.
    except Exception as error:
        logger.error(f"Error in local server websocket for token {token}: {error}")
        websocket_manager.disconnect(token)


@router.post("/project/cli_connect")
async def connect_cli_project(
    project_uuid: str,
    api_key: str = Depends(get_api_key),
    session: AsyncSession = Depends(get_session),
):
    """Update cli token for project."""
    project = (
        (
            await session.execute(
                select(Project.cli_access_key, Project.online).where(
                    Project.uuid == project_uuid
                )
            )
        )
        .mappings()
        .all()
    )

    if project[0]["online"] is True:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN, detail="Already connected"
        )
    else:
        # update project
        res = await session.execute(
            update(Project)
            .where(Project.uuid == project_uuid)
            .values(cli_access_key=api_key)
        )
        await session.commit()
        # return true, connected
        return Response(status_code=status_code.HTTP_200_OK)


@router.post("/save_instances_in_code")
async def save_instances_in_code(
    project_uuid: str,
    function_models: list[str],
    chat_models: list[str],
    samples: list[dict],
    function_schemas: list[dict],
    project: dict = Depends(get_project_cli_access_key),
    session: AsyncSession = Depends(get_session),
):
    changelogs = []
    instances_in_db = await pull_instances(session=session, project_uuid=project_uuid)

    function_models_in_db = (
        instances_in_db["function_model_data"]
        if instances_in_db["function_model_data"]
        else []
    )
    chat_models_in_db = (
        instances_in_db["chat_model_data"] if instances_in_db["chat_model_data"] else []
    )
    samples_in_db = (
        instances_in_db["sample_input_data"]
        if instances_in_db["sample_input_data"]
        else []
    )
    schemas_in_db = (
        instances_in_db["function_schema_data"]
        if instances_in_db["function_schema_data"]
        else []
    )

    function_models_to_add = []
    chat_models_to_add = []
    samples_to_add = []
    schemas_to_add = []

    samples_to_update = []
    schemas_to_update = []

    old_names = [x["name"] for x in function_models_in_db]
    new_names = list(set(function_models) - set(old_names))
    function_models_to_add = [
        {"name": x, "project_uuid": project_uuid} for x in new_names
    ]

    old_names = [x["name"] for x in chat_models_in_db]
    new_names = list(set(chat_models) - set(old_names))
    chat_models_to_add = [{"name": x, "project_uuid": project_uuid} for x in new_names]

    old_names = [x["name"] for x in samples_in_db]
    names_in_code = [x["name"] for x in samples]
    new_names = list(set(names_in_code) - set(old_names))
    samples_to_add = [
        {
            "name": x["name"],
            "content": x["content"],
            "project_uuid": project_uuid,
        }
        for x in samples
        if x["name"] in new_names
    ]

    # sample to update
    samples_to_update = [
        sample
        for sample in samples
        if sample["name"] not in new_names
        and sample["content"]
        != samples_in_db[old_names.index(sample["name"])]["content"]
    ]

    # For FunctionSchema
    old_names = [x["name"] for x in schemas_in_db]
    names_in_code = [x["name"] for x in function_schemas]
    new_names = list(set(names_in_code) - set(old_names))
    schemas_to_add = [
        {
            "name": x["name"],
            "description": x["description"],
            "parameters": x["parameters"],
            "mock_response": x["mock_response"] if "mock_response" in x else None,
            "project_uuid": project_uuid,
        }
        for x in function_schemas
        if x["name"] in new_names
    ]

    # update schemas
    schemas_to_update = [
        schema for schema in function_schemas if schema["name"] not in new_names
    ]

    # save instances
    new_instances = await save_instances(
        session=session,
        function_models=function_models_to_add,
        chat_models=chat_models_to_add,
        sample_inputs=samples_to_add,
        function_schemas=schemas_to_add,
    )

    new_function_models = (
        new_instances["function_model_rows"]
        if new_instances["function_model_rows"]
        else []
    )
    new_chat_models = (
        new_instances["chat_model_rows"] if new_instances["chat_model_rows"] else []
    )
    new_samples = (
        new_instances["sample_input_rows"] if new_instances["sample_input_rows"] else []
    )
    new_schemas = (
        new_instances["function_schema_rows"]
        if new_instances["function_schema_rows"]
        else []
    )

    function_model_name_list_to_update = function_models
    chat_model_name_list_to_update = chat_models

    # update instances
    updated_instances = await update_instances(
        session=session,
        project_uuid=project_uuid,
        function_model_names=function_model_name_list_to_update,
        chat_model_names=chat_model_name_list_to_update,
        sample_input_names=[x["name"] for x in samples],
        function_schema_names=[x["name"] for x in function_schemas],
        sample_inputs=samples_to_update,
        function_schemas=schemas_to_update,
    )

    updated_samples = (
        updated_instances["sample_input_rows"]
        if updated_instances["sample_input_rows"]
        else []
    )
    updated_schemas = (
        updated_instances["function_schema_rows"]
        if updated_instances["function_schema_rows"]
        else []
    )

    # make changelog
    changelogs = [
        {
            "subject": f"function_model",
            "identifiers": [str(x["uuid"]) for x in new_function_models],
            "action": "ADD",
        },
        {
            "subject": f"chat_model",
            "identifiers": [str(x["uuid"]) for x in new_chat_models],
            "action": "ADD",
        },
        {
            "subject": f"sample_input",
            "identifiers": [str(x["uuid"]) for x in new_samples],
            "action": "ADD",
        },
        {
            "subject": f"function_schema",
            "identifiers": [str(x["uuid"]) for x in new_schemas],
            "action": "ADD",
        },
        {
            "subject": f"sample_input",
            "identifiers": [str(x["uuid"]) for x in updated_samples],
            "action": "UPDATE",
        },
        {
            "subject": f"function_schema",
            "identifiers": [str(x["uuid"]) for x in updated_schemas],
            "action": "UPDATE",
        },
    ]
    # delete if len(identifiers) == 0
    changelogs = [x for x in changelogs if len(x["identifiers"]) > 0]
    changelogs_rows = [
        ProjectChangelog(logs=[x], project_uuid=project_uuid) for x in changelogs
    ]
    # save changelog
    if len(changelogs) > 0:
        session.add_all(changelogs_rows)
        await session.commit()

    return Response(status_code=status_code.HTTP_200_OK)


@router.post("/run_log_score")
async def save_run_log_score(
    run_log_uuid: str,
    run_log_scores: Dict,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    try:
        run_log_to_update: RunLog = (
            await session.execute(select(RunLog).where(RunLog.uuid == run_log_uuid))
        ).scalar_one()

    except:
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail=f"RunLog Not found for uuid {run_log_uuid}",
        )

    # update run_log_score in original_value
    score_name_list = list(run_log_scores.keys())
    function_model_of_run_log: FunctionModel = (
        await session.execute(
            select(FunctionModel)
            .join(
                FunctionModelVersion,
                FunctionModelVersion.function_model_uuid == FunctionModel.uuid,
            )
            .where(FunctionModelVersion.uuid == run_log_to_update.version_uuid)
        )
    ).scalar_one()
    try:
        score_list_in_db: List[EvalMetric] = (
            (
                await session.execute(
                    select(EvalMetric).where(
                        EvalMetric.function_model_uuid == function_model_of_run_log.uuid
                    )
                )
            )
            .scalars()
            .all()
        )
        score_name_list_in_db = [x.name for x in score_list_in_db]
        # find score_name_list not in db
        score_name_list_to_add = list(set(score_name_list) - set(score_name_list_in_db))
        eval_metric_to_add = [
            EvalMetric(
                name=x,
                project_uuid=project["uuid"],
                function_model_uuid=function_model_of_run_log.uuid,
            )
            for x in score_name_list_to_add
        ]
        if len(eval_metric_to_add) > 0:
            session.add_all(eval_metric_to_add)
            await session.commit()
    except:
        score_list_in_db: List[EvalMetric] = (
            (
                await session.execute(
                    select(EvalMetric).where(
                        EvalMetric.function_model_uuid == function_model_of_run_log.uuid
                    )
                )
            )
            .scalars()
            .all()
        )
        score_name_list_in_db = [x.name for x in score_list_in_db]
        # find score_name_list not in db
        score_name_list_to_add = list(set(score_name_list) - set(score_name_list_in_db))
        eval_metric_to_add = [
            EvalMetric(
                name=x,
                project_uuid=project["uuid"],
                function_model_uuid=function_model_of_run_log.uuid,
            )
            for x in score_name_list_to_add
        ]
        if len(eval_metric_to_add) > 0:
            session.add_all(eval_metric_to_add)
            await session.commit()
            
    eval_metric_to_use: List[EvalMetric] = (
        (
            await session.execute(
                select(EvalMetric)
                .where(EvalMetric.function_model_uuid == function_model_of_run_log.uuid)
                .where(EvalMetric.name.in_(score_name_list))
            )
        )
        .scalars()
        .all()
    )

    eval_metric_dict = {x.name: x.uuid for x in eval_metric_to_use}

    scores_to_add: List[RunLogScore] = []
    for key, value in run_log_scores.items():
        scores_to_add.append(
            RunLogScore(
                run_log_uuid=run_log_uuid,
                eval_metric_uuid=eval_metric_dict[key],
                value=value,
            )
        )

    for score in scores_to_add:
        (
            await session.execute(
                insert(RunLogScore)
                .values(
                    run_log_uuid=score.run_log_uuid,
                    eval_metric_uuid=score.eval_metric_uuid,
                    value=score.value,
                )
                .on_conflict_do_update(  # if conflict, append
                    index_elements=[
                        RunLogScore.run_log_uuid,
                        RunLogScore.eval_metric_uuid,
                    ],
                    set_={"value": score.value},
                )
            )
        )

    await session.commit()

    return Response(status_code=status_code.HTTP_200_OK)


@router.post("/chat_session_score")
async def save_chat_session_score(
    chat_session_uuid: str,
    chat_session_scores: Dict,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    pass


@router.post("/chat_message_score")
async def save_chat_message_score(
    chat_message_uuid: str,
    chat_message_scores: Dict,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    pass


@router.post("/run_log")
async def save_run_log(
    version_uuid: str,
    run_log_request_body: RunLogRequestBody,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    api_response = run_log_request_body.api_response
    
    if not isinstance(api_response, dict):
        api_response = api_response.model_dump()

    latency = api_response["response_ms"] if "response_ms" in api_response else None
    latency = api_response["_response_ms"] if "_response_ms" in api_response else latency
    if not latency:
        if "latency" in run_log_request_body.metadata:
            latency = run_log_request_body.metadata["latency"]
            
    # save log
    run_log_row = RunLog(
        uuid=run_log_request_body.uuid,
        inputs=run_log_request_body.inputs,
        raw_output=api_response["choices"][0]["message"]["content"],
        parsed_outputs=run_log_request_body.parsed_outputs,
        run_from_deployment=True,
        version_uuid=version_uuid,
        prompt_tokens=api_response["usage"]["prompt_tokens"],
        completion_tokens=api_response["usage"]["completion_tokens"],
        total_tokens=api_response["usage"]["total_tokens"],
        latency=latency,
        cost=completion_cost(api_response),
        run_log_metadata=run_log_request_body.metadata,
        project_uuid=project["uuid"],
    )
    session.add(run_log_row)
    await session.commit()

    return Response(status_code=status_code.HTTP_200_OK)


@router.post("/chat_log")
async def save_chat_log(
    session_uuid: str,
    chat_message_requests_body: List[ChatMessageRequestBody],
    version_uuid: Optional[str] = None,
    project: dict = Depends(get_project),
    db_session: AsyncSession = Depends(get_session),
):
    if not session_uuid and not version_uuid:
        raise HTTPException(
            status_code=status_code.HTTP_400_BAD_REQUEST, detail="session_uuid or version_uuid required"
        )

    # check session
    session: Optional[ChatSession] = (
        await db_session.execute(
            select(ChatSession).where(ChatSession.uuid == session_uuid)
        )
    ).scalar_one_or_none()

    if not session:
        # create session
        print("CREATE_NEW_SESSION")
        if not version_uuid:
            raise HTTPException(
                status_code=status_code.HTTP_400_BAD_REQUEST,
                detail="If you want to create session with new UUID, version_uuid required",
            )
        # create session
        db_session.add(
            ChatSession(
                uuid=session_uuid,
                version_uuid=version_uuid,
                run_from_deployment=True,
            )
        )
        await db_session.commit()
        await db_session.refresh(session)

    version_uuid = session.version_uuid
    model: str = (
        await db_session.execute(
            select(ChatModelVersion.model).where(ChatModelVersion.uuid == version_uuid)
        )
    ).scalar_one()

    # make ChatMessage
    messages: List[ChatMessage] = []
    for chat_message_request in chat_message_requests_body:
        token_usage = {}
        latency = 0
        token_count = token_counter(model, chat_message_request.message["content"])
        cost = None
        token_usage = None
        latency = None

        if chat_message_request.api_response:
            cost = completion_cost(chat_message_request.api_response)
            token_usage = (
                chat_message_request.api_response["usage"]
                if "usage" in chat_message_request.api_response
                else None
            )
            latency = (
                chat_message_request.api_response["_response_ms"]
                if "_response_ms" in chat_message_request.api_response
                else None
            )

        messages.append(
            ChatMessage(
                **{
                    "uuid": chat_message_request.uuid,
                    "session_uuid": session_uuid,
                    "role": chat_message_request.message["role"],
                    "content": chat_message_request.message["content"],
                    "name": chat_message_request.message["name"]
                    if "name" in chat_message_request.message
                    else None,
                    "function_call": chat_message_request.message["function_call"]
                    if "function_call" in chat_message_request.message
                    else None,
                    "tool_calls": chat_message_request.message["tool_calls"]
                    if "tool_calls" in chat_message_request.message
                    else None,
                    "chat_message_metadata": chat_message_request.metadata,
                    "token_count": token_count,
                }
            )
        )

    db_session.add_all(messages)

    # get latest chat_message
    if chat_message_requests_body[-1].message["role"] == "assistant":
        latest_chat_message = (
            await db_session.execute(
                select(ChatMessage)
                .where(ChatMessage.session_uuid == session_uuid)
                .where(ChatMessage.role.in_(["user", "function"]))
                .order_by(desc(ChatMessage.created_at))
                .limit(1)
            )
        ).scalar_one()

        # save log
        chat_log = ChatLog(
            user_message_uuid=latest_chat_message.uuid,
            assistant_message_uuid=chat_message_requests_body[-1].uuid,
            session_uuid=session_uuid,
            project_uuid=project["uuid"],
            prompt_tokens=token_usage["prompt_tokens"],
            completion_tokens=token_usage["completion_tokens"],
            total_tokens=token_usage["total_tokens"],
            latency=latency,
            cost=cost,
        )
        await db_session.flush()
        db_session.add(chat_log)

    await db_session.commit()
    return Response(status_code=status_code.HTTP_200_OK)


@router.post("/make_session")
async def make_session(
    session_uuid: str,
    version_uuid: str,
    project: dict = Depends(get_project),
    db_session: AsyncSession = Depends(get_session),
):
    # check version
    version = (
        (
            await db_session.execute(
                select(ChatModelVersion).where(ChatModelVersion.uuid == version_uuid)
            )
        )
        .scalars()
        .all()
    )

    if len(version) == 0:
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail="Chat Model Version not found",
        )
    # make Session
    session_row = ChatSession(
        uuid=session_uuid, version_uuid=version_uuid, run_from_deployment=True
    )
    db_session.add(session_row)
    await db_session.commit()
