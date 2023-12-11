"""APIs for package management"""
from uuid import uuid4

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

from fastapi import (
    APIRouter,
    Response,
    HTTPException,
    WebSocket,
    Depends,
)
from fastapi.responses import JSONResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_500_INTERNAL_SERVER_ERROR,
    HTTP_404_NOT_FOUND,
    HTTP_406_NOT_ACCEPTABLE,
)

from utils.security import get_api_key, get_project, get_cli_user_id
from api.dependency import get_websocket_token
from utils.logger import logger

from base.database import get_session
from base.websocket_connection import websocket_manager
from crud import update_instances, pull_instances, save_instances
from db_models import *
from modules.types import InstanceType
from litellm.utils import completion_cost
from ..models import (
    DeployedFunctionModelVersionInstance,
    DeployedChatModelVersionInstance,
    DeployedPromptInstance,
    DeployedFunctionModelInstance,
    UsersOrganizationsInstance,
    CliProjectInstance,
    CheckUpdateResponseInstance,
    FetchFunctionModelVersionResponseInstance,
    FetchChatModelVersionResponseInstance,
    CliChatMessageInstance,
)

router = APIRouter()


@router.get("/check_cli_access", response_model=bool)
async def check_cli_access(
    api_key: str = Depends(get_api_key), session: AsyncSession = Depends(get_session)
):
    """Check if user has CLI access"""
    statement = select(CliAccess.user_id).where(CliAccess.api_key == api_key)
    result = await session.execute(statement)
    user_id = result.scalar_one_or_none()
    if not user_id:
        return False  # Response(status_code=HTTP_403_FORBIDDEN)
    return True  # Response(status_code=HTTP_200_OK)


@router.get("/list_orgs", response_model=List[UsersOrganizationsInstance])
async def list_orgs(
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """List user's organizations"""
    try:
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
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_projects", response_model=List[CliProjectInstance])
async def list_projects(
    organization_id: str,
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """List projects in organization"""
    try:
        res: Result = await session.execute(
            select(
                Project.uuid, Project.name, Project.description, Project.version
            ).where(Project.organization_id == organization_id)
        )
        return [dict(x) for x in res.mappings().all()]
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_project_version", response_model=int)
async def get_project_version(
    project_uuid: str,
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """Get project version"""
    try:
        res: Result = await session.execute(
            select(Project.version).where(Project.uuid == project_uuid)
        )

        return res.one()._mapping
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


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
    try:
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
            print(res)
            return JSONResponse(res, status_code=HTTP_200_OK)
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
            DeployedFunctionModelInstance(**dict(x)).model_dump()
            for x in function_models
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

        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get(
    "/fetch_function_model_version",
    response_model=FetchFunctionModelVersionResponseInstance,
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
    try:
        # find_function_model
        try:
            function_model = (
                (
                    await session.execute(
                        select(FunctionModel.uuid, FunctionModel.name)
                        .where(FunctionModel.project_uuid == project["uuid"])
                        .where(FunctionModel.name == function_model_name)
                    )
                )
                .mappings()
                .one()
            )
        except:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Prompt Model not found"
            )
        try:
            if version == "deploy":
                # get published, ab_test function_model_versions
                deployed_function_model_versions = (
                    (
                        await session.execute(
                            select(DeployedFunctionModelVersion).where(
                                DeployedFunctionModelVersion.function_model_uuid
                                == function_model["uuid"]
                            )
                        )
                    )
                    .scalars()
                    .all()
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
                prompts = [
                    DeployedPromptInstance(**dict(x)).model_dump() for x in prompts
                ]

                res = {
                    "function_model_versions": deployed_function_model_versions,
                    "prompts": prompts,
                }
            else:
                try:
                    version = int(version)
                except ValueError:
                    version = version

                if isinstance(version, int):
                    function_model_versions = (
                        (
                            await session.execute(
                                select(FunctionModelVersion)
                                .where(
                                    FunctionModelVersion.function_model_uuid
                                    == function_model["uuid"]
                                )
                                .where(FunctionModelVersion.version == version)
                            )
                        )
                        .scalars()
                        .all()
                    )

                    function_model_versions = [
                        DeployedFunctionModelVersionInstance(
                            **x.model_dump()
                        ).model_dump()
                        for x in function_model_versions
                    ]

                elif version == "latest":
                    function_model_versions = (
                        (
                            await session.execute(
                                select(FunctionModelVersion)
                                .where(
                                    FunctionModelVersion.function_model_uuid
                                    == function_model["uuid"]
                                )
                                .order_by(desc(FunctionModelVersion.version))
                                .limit(1)
                            )
                        )
                        .scalars()
                        .all()
                    )
                    function_model_versions = [
                        DeployedFunctionModelVersionInstance(
                            **x.model_dump()
                        ).model_dump()
                        for x in function_model_versions
                    ]

                versions_uuid_list = [str(x["uuid"]) for x in function_model_versions]
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
                prompts = [
                    DeployedPromptInstance(**dict(x)).model_dump() for x in prompts
                ]

                res = {
                    "function_model_versions": function_model_versions,
                    "prompts": prompts,
                }

            return JSONResponse(res, status_code=HTTP_200_OK)
        except Exception as exc:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="FunctionModel Version Not Found"
            ) from exc
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.get(
    "/fetch_chat_model_version_with_chat_message",
    response_model=FetchChatModelVersionResponseInstance,
)
async def fetch_chat_model_version_with_chat_message(
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
                    status_code=HTTP_404_NOT_FOUND, detail="Session not found"
                )
            session_chat_model_version = (
                (
                    await db_session.execute(
                        select(ChatModelVersion).where(
                            ChatModelVersion.uuid == session["version_uuid"]
                        )
                    )
                )
                .scalars()
                .all()
            )

            session_chat_model_version = [
                DeployedChatModelVersionInstance(**x.model_dump()).model_dump()
                for x in session_chat_model_version
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
                "chat_messages": chat_messages,
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
                    status_code=HTTP_404_NOT_FOUND, detail="Chat Model not found"
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

            res = {"chat_model_versions": chat_model_version, "chat_messages": []}
        else:
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
                    status_code=HTTP_404_NOT_FOUND, detail="Chat Model not found"
                )

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
            )

            deployed_chat_model_versions = [
                DeployedChatModelVersionInstance(**x.model_dump()).model_dump()
                for x in deployed_chat_model_versions
            ]

            res = {
                "chat_model_versions": deployed_chat_model_versions,
                "chat_messages": [],
            }

        return JSONResponse(res, status_code=HTTP_200_OK)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


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


@router.post("/connect_cli_project")
async def connect_cli_project(
    project_uuid: str,
    api_key: str = Depends(get_api_key),
    session: AsyncSession = Depends(get_session),
):
    """Update cli token for project."""
    try:
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
                status_code=HTTP_403_FORBIDDEN, detail="Already connected"
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
            return Response(status_code=HTTP_200_OK)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.post("/save_instances_in_code")
async def save_instances_in_code(
    project_uuid: str,
    function_models: list[str],
    chat_models: list[str],
    samples: list[dict],
    function_schemas: list[dict],
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    try:
        changelogs = []
        instances_in_db = await pull_instances(
            session=session, project_uuid=project_uuid
        )

        function_models_in_db = (
            instances_in_db["function_model_data"]
            if instances_in_db["function_model_data"]
            else []
        )
        chat_models_in_db = (
            instances_in_db["chat_model_data"]
            if instances_in_db["chat_model_data"]
            else []
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
        chat_models_to_add = [
            {"name": x, "project_uuid": project_uuid} for x in new_names
        ]

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
            new_instances["sample_input_rows"]
            if new_instances["sample_input_rows"]
            else []
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
            ProjectChangelog(logs=x, project_uuid=project_uuid) for x in changelogs
        ]
        # save changelog
        if len(changelogs) > 0:
            session.add_all(changelogs_rows)
            await session.commit()

        return Response(status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/log_general")
async def log_general(
    type: str,
    identifier: Optional[str] = None,
    content: Dict[str, Any] = {},
    metadata: Dict[str, Any] = {},
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    try:
        if type == InstanceType.RunLog.value:
            if not identifier:
                identifier = str(uuid4())
                run_log_to_insert = content
                run_log_to_insert["run_log_metadata"] = metadata
                run_log_to_insert["uuid"] = identifier
                try:
                    # check ["uuid", "version_uuid"] in content
                    if "uuid" not in content or "version_uuid" not in content:
                        raise Exception
                    session.add(RunLog(**run_log_to_insert))
                    await session.commit()
                except Exception as exc:
                    raise HTTPException(
                        status_code=HTTP_406_NOT_ACCEPTABLE,
                        detail="RunLog Content Column is not valid",
                    )
            else:
                try:
                    original_value = (
                        (
                            await session.execute(
                                select(RunLog.uuid, RunLog.run_log_metadata).where(
                                    RunLog.uuid == identifier
                                )
                            )
                        )
                        .one()
                        ._mapping
                    )

                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"RunLog Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["run_log_metadata"]
                    if original_value["run_log_metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value

                await session.execute(
                    update(RunLog)
                    .where(RunLog.uuid == identifier)
                    .values(run_log_metadata=new_metadata)
                )

        elif type == InstanceType.ChatMessage.value:
            if not identifier:
                identifier = str(uuid4())
                chat_message_to_insert = content
                chat_message_to_insert["chat_message_metadata"] = metadata
                chat_message_to_insert["uuid"] = identifier
                try:
                    if (
                        "uuid" not in content
                        or "role" not in content
                        or "session_uuid" not in content
                    ):
                        raise Exception
                    session.add(ChatMessage(**chat_message_to_insert))
                    if chat_message_to_insert["role"] == "assistant":
                        latest_chat_message = (
                            await session.execute(
                                select(ChatMessage)
                                .where(
                                    ChatMessage.session_uuid
                                    == chat_message_to_insert["session_uuid"]
                                )
                                .order_by(desc(ChatMessage.created_at))
                                .limit(1)
                            )
                        ).scalar_one()
                    await session.flush()
                    session.add(
                        ChatLog(
                            user_message_uuid=latest_chat_message.uuid,
                            assistant_message_uuid=chat_message_to_insert["uuid"],
                            session_uuid=chat_message_to_insert["session_uuid"],
                            project_uuid=project["uuid"],
                            prompt_tokens=chat_message_to_insert["prompt_tokens"]
                            if "prompt_tokens" in metadata
                            else None,
                            completion_tokens=chat_message_to_insert[
                                "completion_tokens"
                            ]
                            if "completion_tokens" in chat_message_to_insert
                            else None,
                            total_tokens=chat_message_to_insert["total_tokens"]
                            if "total_tokens" in metadata
                            else None,
                            latency=chat_message_to_insert["response_ms"]
                            if "response_ms" in metadata
                            else None,
                            cost=completion_cost(chat_message_to_insert["api_response"])
                            if "api_response" in metadata
                            else None,
                        )
                    )

                    await session.commit()
                except Exception as exc:
                    raise HTTPException(
                        status_code=HTTP_406_NOT_ACCEPTABLE,
                        detail="ChatMessage Content Column is not valid",
                    ) from exc
            else:
                try:
                    original_value = (
                        (
                            await session.execute(
                                select(
                                    ChatMessage.uuid, ChatMessage.chat_message_metadata
                                ).where(ChatMessage.uuid == identifier)
                            )
                        )
                        .one()
                        ._mapping
                    )

                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"ChatMessage Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["chat_message_metadata"]
                    if original_value["chat_message_metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value

                await session.execute(
                    update(ChatMessage)
                    .where(ChatMessage.uuid == identifier)
                    .values(chat_message_metadata=new_metadata)
                )

        elif type == InstanceType.ChatSession.value:
            if not identifier:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST, detail="Session uuid is required"
                )
            else:
                try:
                    original_value = (
                        (
                            await session.execute(
                                select(
                                    ChatSession.uuid, ChatSession.session_metadata
                                ).where(ChatSession.uuid == identifier)
                            )
                        )
                        .one()
                        ._mapping
                    )

                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"Session Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["session_metadata"]
                    if original_value["session_metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value
                await session.execute(
                    update(ChatSession)
                    .where(ChatSession.uuid == identifier)
                    .values(session_metadata=new_metadata)
                )

        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.post("/log_deployment_run")
async def log_deployment_run(
    log_uuid: str,
    version_uuid: str,
    inputs: Optional[Dict[str, Any]] = None,
    api_response: Optional[Dict[str, Any]] = None,
    parsed_outputs: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    try:
        # save log
        run_log_row = RunLog(
            uuid=log_uuid,
            inputs=inputs,
            raw_output=api_response["choices"][0]["message"]["content"]
            if api_response
            else None,
            parsed_outputs=parsed_outputs,
            input_register_name=None,
            run_from_deployment=True,
            version_uuid=version_uuid,
            prompt_tokens=api_response["usage"]["prompt_tokens"]
            if api_response
            else None,
            completion_tokens=api_response["usage"]["completion_tokens"]
            if api_response
            else None,
            total_tokens=api_response["usage"]["total_tokens"]
            if api_response
            else None,
            latency=api_response["response_ms"] if api_response else None,
            cost=completion_cost(api_response) if api_response else None,
            run_log_metadata=metadata,
        )
        session.add(run_log_row)
        await session.commit()

        return Response(status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/log_deployment_chat")
async def log_deployment_chat(
    session_uuid: str,
    log_uuid_list: List[str],
    version_uuid: str,
    messages: List[Dict[str, Any]] = [],
    metadata: Optional[List[Dict[str, Any]]] = None,
    project: dict = Depends(get_project),
    db_session: AsyncSession = Depends(get_session),
):
    try:
        # check session
        session = (
            (
                await db_session.execute(
                    select(ChatSession).where(ChatSession.uuid == session_uuid)
                )
            )
            .scalars()
            .all()
        )

        if len(session) == 0:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Session not found"
            )

        # make logs
        logs: List[ChatMessage] = []
        for log_uuid, message, meta in zip(log_uuid_list, messages, metadata):
            token_usage = {}
            latency = 0
            cost = completion_cost(meta["api_response"]) if meta else None
            if "token_usage" in meta:
                token_usage = meta["token_usage"]
                del meta["token_usage"]
            if "response_ms" in meta:
                latency = meta["response_ms"]
                del meta["response_ms"]
            if "_response_ms" in meta:
                latency = meta["_response_ms"]
                del meta["_response_ms"]
            if "latency" in meta:
                latency = meta["latency"]
                del meta["latency"]
            logs.append(
                ChatMessage(
                    **{
                        "uuid": log_uuid,
                        "session_uuid": session_uuid,
                        "role": message["role"],
                        "content": message["content"],
                        "name": message["name"] if "name" in message else None,
                        "function_call": message["function_call"]
                        if "function_call" in message
                        else None,
                        "tool_calls": message["tool_calls"]
                        if "tool_calls" in message
                        else None,
                        "chat_message_metadata": meta,
                    }
                )
            )

        # get latest chat_message
        latest_chat_message = (
            await db_session.execute(
                select(ChatMessage)
                .where(ChatMessage.session_uuid == session_uuid)
                .order_by(desc(ChatMessage.created_at))
                .limit(1)
            )
        ).scalar_one()
        # save logs
        db_session.add_all(logs)
        # TODO: add ChatLog
        chat_log = ChatLog(
            user_message_uuid=latest_chat_message.uuid,
            assistant_message_uuid=logs[0].uuid,
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
        return Response(status_code=HTTP_200_OK)
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.post("/make_session")
async def make_session(
    session_uuid: str,
    version_uuid: str,
    project: dict = Depends(get_project),
    db_session: AsyncSession = Depends(get_session),
):
    try:
        # check version
        version = (
            (
                await db_session.execute(
                    select(ChatModelVersion).where(
                        ChatModelVersion.uuid == version_uuid
                    )
                )
            )
            .scalars()
            .all()
        )

        if len(version) == 0:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Chat Model Version not found"
            )
        # make Session
        session_row = ChatSession(
            uuid=session_uuid, version_uuid=version_uuid, run_from_deployment=True
        )
        db_session.add(session_row)
        await db_session.commit()

    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
