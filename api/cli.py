"""APIs for package management"""
import asyncio
from operator import truediv
from uuid import UUID, uuid4

from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result
from sqlmodel import select, asc, desc, update

from fastapi import (
    APIRouter,
    Response,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    Query,
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
from utils.dependency import get_websocket_token
from utils.logger import logger

from base.database import get_session
from base.websocket_connection import websocket_manager
from crud import update_instances, pull_instances, save_instances
from ..models import *
from modules.types import (
    InstanceType,
    DeployedPromptModelVersionInstance,
    DeployedChatModelVersionInstance,
)
from litellm.utils import completion_cost

router = APIRouter()


@router.get("/check_cli_access")
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


@router.get("/list_orgs")
async def list_orgs(
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """List user's organizations"""
    try:
        res: Result = await session.execute(
            select(
                UserOrganizations.organization_id,
                UserOrganizations.name,
                UserOrganizations.slug,
            ).where(UserOrganizations.user_id == user_id)
        )

        res_dict: List[Dict] = res.mappings().all()
        return JSONResponse(res_dict, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_projects")
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
        return res.mappings().all()
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_project_version")
async def get_project_version(
    project_uuid: str,
    user_id: str = Depends(get_cli_user_id),
    session: AsyncSession = Depends(get_session),
):
    """Get project version"""
    try:
        res: Result = await session.execute(
            select(Project.version).where(Project.uuid == UUID(project_uuid))
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
                select(Project.version).where(Project.uuid == UUID(project["uuid"]))
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
            return JSONResponse(res, status_code=HTTP_200_OK)
        else:
            need_update = True

        # get current project status

        # get prompt_models
        prompt_models = (
            (
                await session.execute(
                    select(PromptModel.uuid, PromptModel.name).where(
                        PromptModel.project_uuid == UUID(project["uuid"])
                    )
                )
            )
            .mappings()
            .all()
        )

        # get published, ab_test prompt_model_versions
        deployed_prompt_model_versions: List[Dict] = (
            (
                await session.execute(
                    select(DeployedPromptModelVersion).where(
                        DeployedPromptModelVersion.prompt_model_uuid.in_(
                            [x["uuid"] for x in prompt_models]
                        )
                    )
                )
            )
            .mappings()
            .all()
        )

        # filter out columns
        deployed_prompt_model_versions = [
            DeployedPromptModelVersionInstance(**x).dict()
            for x in deployed_prompt_model_versions
        ]

        versions_uuid_list = [x["uuid"] for x in deployed_prompt_model_versions]
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

        res = {
            "need_update": need_update,
            "version": project_version,
            "project_status": {
                "prompt_models": prompt_models,
                "prompt_model_versions": deployed_prompt_model_versions,
                "prompts": prompts,
            },
        }

        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/fetch_prompt_model_version")
async def fetch_prompt_model_version(
    prompt_model_name: str,
    version: Optional[Union[str, int]] = "deploy",
    project: dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    """
    Only use when use_cache = False.
    Find published version of prompt_model_version and prompt and return them.

    Input:
        - prompt_model_name: name of prompt_model

    Return:
        - prompt_model_versions : List[Dict]
        - prompts : List[Dict]
    """
    try:
        # find_prompt_model
        try:
            prompt_model = (
                (
                    await session.execute(
                        select(PromptModel.uuid, PromptModel.name)
                        .where(PromptModel.project_uuid == UUID(project["uuid"]))
                        .where(PromptModel.name == prompt_model_name)
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
                # get published, ab_test prompt_model_versions
                deployed_prompt_model_versions = (
                    (
                        await session.execute(
                            select(DeployedPromptModelVersion).where(
                                DeployedPromptModelVersion.prompt_model_uuid
                                == prompt_model["uuid"]
                            )
                        )
                    )
                    .mappings()
                    .all()
                )
                deployed_prompt_model_versions = [
                    DeployedPromptModelVersionInstance(**x).dict()
                    for x in deployed_prompt_model_versions
                ]

                versions_uuid_list = [x["uuid"] for x in deployed_prompt_model_versions]
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

                res = {
                    "prompt_model_versions": deployed_prompt_model_versions,
                    "prompts": prompts,
                }
            else:
                try:
                    version = int(version)
                except ValueError:
                    version = version

                if isinstance(version, int):
                    prompt_model_versions = (
                        (
                            await session.execute(
                                select(PromptModelVersion)
                                .where(
                                    PromptModelVersion.prompt_model_uuid
                                    == prompt_model["uuid"]
                                )
                                .where(PromptModelVersion.version == version)
                            )
                        )
                        .mappings()
                        .all()
                    )

                    prompt_model_versions = [
                        DeployedPromptModelVersionInstance(**x).dict()
                        for x in prompt_model_versions
                    ]

                elif version == "latest":
                    prompt_model_versions = (
                        (
                            await session.execute(
                                select(PromptModelVersion)
                                .where(
                                    PromptModelVersion.prompt_model_uuid
                                    == prompt_model["uuid"]
                                )
                                .order_by(desc(PromptModelVersion.version))
                                .limit(1)
                            )
                        )
                        .mappings()
                        .all()
                    )
                    prompt_model_versions = [
                        DeployedPromptModelVersionInstance(**x).dict()
                        for x in prompt_model_versions
                    ]

                versions_uuid_list = [x["uuid"] for x in prompt_model_versions]
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

                res = {
                    "prompt_model_versions": prompt_model_versions,
                    "prompts": prompts,
                }

            return JSONResponse(res, status_code=HTTP_200_OK)
        except Exception as exc:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="PromptModel Version Not Found"
            ) from exc
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.get("/fetch_chat_model_version_with_chat_log")
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
                            select(ChatLogSession.version_uuid).where(
                                ChatLogSession.uuid == UUID(session_uuid)
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
                .mappings()
                .all()
            )

            session_chat_model_version = [
                DeployedChatModelVersionInstance(**x).dict()
                for x in session_chat_model_version
            ]

            # find chat logs
            chat_logs = (
                (
                    await db_session.execute(
                        select(
                            ChatLog.role,
                            ChatLog.name,
                            ChatLog.content,
                            ChatLog.tool_calls,
                        )
                        .where(ChatLog.session_uuid == UUID(session_uuid))
                        .order_by(asc(ChatLog.created_at))
                    )
                )
                .mappings()
                .all()
            )

            res = {
                "chat_model_versions": session_chat_model_version,
                "chat_logs": chat_logs,
            }
        elif isinstance(version, int):
            # find chat_model_version
            try:
                chat_model = (
                    (
                        await db_session.execute(
                            select(ChatModel.uuid, ChatModel.name)
                            .where(ChatModel.project_uuid == UUID(project["uuid"]))
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
                .mappings()
                .all()
            )

            chat_model_version = [
                DeployedChatModelVersionInstance(**x).dict() for x in chat_model_version
            ]

            res = {"chat_model_versions": chat_model_version, "chat_logs": []}
        else:
            try:
                chat_model = (
                    (
                        await db_session.execute(
                            select(ChatModel.uuid, ChatModel.name)
                            .where(ChatModel.project_uuid == UUID(project["uuid"]))
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
                .mappings()
                .all()
            )

            deployed_chat_model_versions = [
                DeployedChatModelVersionInstance(**x).dict()
                for x in deployed_chat_model_versions
            ]

            res = {"chat_model_versions": deployed_chat_model_versions, "chat_logs": []}

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
    session: AsyncSession = Depends(get_session),
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
                        Project.uuid == UUID(project_uuid)
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
                .where(Project.uuid == UUID(project_uuid))
                .values(cli_access_key=api_key)
            )
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
    prompt_models: list[str],
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

        prompt_models_in_db = (
            instances_in_db["prompt_model_data"]
            if instances_in_db["prompt_model_data"]
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

        prompt_models_to_add = []
        chat_models_to_add = []
        samples_to_add = []
        schemas_to_add = []

        samples_to_update = []
        schemas_to_update = []

        old_names = [x["name"] for x in prompt_models_in_db]
        new_names = list(set(prompt_models) - set(old_names))
        prompt_models_to_add = [
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
            prompt_models=prompt_models_to_add,
            chat_models=chat_models_to_add,
            sample_inputs=samples_to_add,
            function_schemas=schemas_to_add,
        )

        new_prompt_models = (
            new_instances["prompt_model_rows"]
            if new_instances["prompt_model_rows"]
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

        prompt_model_name_list_to_update = prompt_models
        chat_model_name_list_to_update = chat_models

        # update instances
        updated_instances = (
            await update_instances(
                session=session,
                project_uuid=project_uuid,
                prompt_model_name_list=prompt_model_name_list_to_update,
                chat_model_name_list=chat_model_name_list_to_update,
                sample_input_names=[x["name"] for x in samples],
                function_schema_names=[x["name"] for x in function_schemas],
                sample_inputs=samples_to_update,
                function_schemas=schemas_to_update,
            )
        )[0]

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
                "subject": f"prompt_model",
                "identifiers": [x["uuid"] for x in new_prompt_models],
                "action": "ADD",
            },
            {
                "subject": f"chat_model",
                "identifiers": [x["uuid"] for x in new_chat_models],
                "action": "ADD",
            },
            {
                "subject": f"sample_input",
                "identifiers": [x["uuid"] for x in new_samples],
                "action": "ADD",
            },
            {
                "subject": f"function_schema",
                "identifiers": [x["uuid"] for x in new_schemas],
                "action": "ADD",
            },
            {
                "subject": f"sample_input",
                "identifiers": [x["uuid"] for x in updated_samples],
                "action": "UPDATE",
            },
            {
                "subject": f"function_schema",
                "identifiers": [x["uuid"] for x in updated_schemas],
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
                    session.add_all([RunLog(**x) for x in run_log_to_insert])
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
                                    RunLog.uuid == UUID(identifier)
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
                    .where(RunLog.uuid == UUID(identifier))
                    .values(run_log_metadata=new_metadata)
                )

        elif type == InstanceType.ChatLog.value:
            if not identifier:
                identifier = str(uuid4())
                chat_log_to_insert = content
                chat_log_to_insert["chat_log_metadata"] = metadata
                chat_log_to_insert["uuid"] = identifier
                try:
                    if (
                        "uuid" not in content
                        or "role" not in content
                        or "session_uuid" not in content
                    ):
                        raise Exception
                    session.add_all([ChatLog(**x) for x in chat_log_to_insert])
                    await session.commit()
                except Exception as exc:
                    raise HTTPException(
                        status_code=HTTP_406_NOT_ACCEPTABLE,
                        detail="ChatLog Content Column is not valid",
                    ) from exc
            else:
                try:
                    original_value = (
                        (
                            await session.execute(
                                select(ChatLog.uuid, ChatLog.chat_log_metadata).where(
                                    ChatLog.uuid == UUID(identifier)
                                )
                            )
                        )
                        .one()
                        ._mapping
                    )

                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"ChatLog Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["chat_log_metadata"]
                    if original_value["chat_log_metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value

                await session.execute(
                    update(ChatLog)
                    .where(ChatLog.uuid == UUID(identifier))
                    .values(chat_log_metadata=new_metadata)
                )

        elif type == InstanceType.ChatLogSession.value:
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
                                    ChatLogSession.uuid, ChatLogSession.session_metadata
                                ).where(ChatLogSession.uuid == UUID(identifier))
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
                    update(ChatLogSession)
                    .where(ChatLogSession.uuid == UUID(identifier))
                    .values(session_metadata=new_metadata)
                )

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
            token_usage=api_response["usage"] if api_response else None,
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
                    select(ChatLogSession).where(
                        ChatLogSession.uuid == UUID(session_uuid)
                    )
                )
            )
            .mappings()
            .all()
        )

        if len(session) == 0:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Session not found"
            )

        # make logs
        logs = []
        print(log_uuid_list, messages, metadata)
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
                ChatLog(
                    **{
                        "uuid": log_uuid,
                        "session_uuid": session_uuid,
                        "role": message["role"],
                        "content": message["content"],
                        "name": message["name"] if "name" in message else None,
                        "tool_calls": message["tool_calls"]
                        if "tool_calls" in message
                        else None,
                        "token_usage": token_usage,
                        "latency": latency,
                        "cost": cost,
                        "chat_log_metadata": meta,
                    }
                )
            )
        # save logs
        db_session.add_all(logs)
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
                        ChatModelVersion.uuid == UUID(version_uuid)
                    )
                )
            )
            .mappings()
            .all()
        )

        if len(version) == 0:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Chat Model Version not found"
            )
        # make Session
        session_row = ChatLogSession(uuid=session_uuid, version_uuid=version_uuid)
        db_session.add(session_row)
        await db_session.commit()

    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
