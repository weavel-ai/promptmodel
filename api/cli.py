"""APIs for package management"""
import asyncio
from operator import truediv
from uuid import UUID, uuid4

from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from pydantic import BaseModel

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

# from base.database import supabase
from base.websocket_connection import websocket_manager
from modules.types import InstanceType
from litellm.utils import completion_cost

router = APIRouter()


@router.get("/check_cli_access")
async def check_cli_access(api_key: str = Depends(get_api_key)):
    """Check if user has CLI access"""
    user_id = (
        supabase.table("cli_access").select("user_id").eq("api_key", api_key).execute()
    ).data
    if not user_id:
        return False  # Response(status_code=HTTP_403_FORBIDDEN)
    return True  # Response(status_code=HTTP_200_OK)


@router.get("/list_orgs")
async def list_orgs(user_id: str = Depends(get_cli_user_id)):
    """List user's organizations"""
    try:
        res = (
            supabase.table("user_organizations")
            .select("name, slug, organization_id")
            .eq("user_id", user_id)
            .execute()
            .data
        )
        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_projects")
async def list_projects(organization_id: str, user_id: str = Depends(get_cli_user_id)):
    """List projects in organization"""
    try:
        res = (
            supabase.table("project")
            .select("uuid, name, description, version")
            .eq("organization_id", organization_id)
            .execute()
            .data
        )
        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_project_version")
async def get_project_version(
    project_uuid: str, user_id: str = Depends(get_cli_user_id)
):
    """Get project version"""
    try:
        res = (
            supabase.table("project")
            .select("version")
            .eq("uuid", project_uuid)
            .execute()
            .data
        )
        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/check_update")
async def check_update(cached_version: int, project: dict = Depends(get_project)):
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
        project_version = (
            supabase.table("project")
            .select("version")
            .eq("uuid", project["uuid"])
            .single()
            .execute()
            .data["version"]
        )
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
            supabase.table("prompt_model")
            .select("uuid, name")
            .eq("project_uuid", project["uuid"])
            .execute()
            .data
        )

        # get published, ab_test prompt_model_versions
        deployed_prompt_model_versions = (
            supabase.table("deployed_prompt_model_version")
            .select(
                "uuid, from_version, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
            )
            # .select("uuid, from_version, prompt_model_uuid, model, is_published, is_ab_test, ratio")
            .in_("prompt_model_uuid", [x["uuid"] for x in prompt_models])
            .execute()
            .data
        )

        versions_uuid_list = [x["uuid"] for x in deployed_prompt_model_versions]
        # get prompts
        prompts = (
            supabase.table("prompt")
            .select("version_uuid, role, step, content")
            .in_("version_uuid", versions_uuid_list)
            .execute()
            .data
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
                supabase.table("prompt_model")
                .select("uuid, name")
                .eq("project_uuid", project["uuid"])
                .eq("name", prompt_model_name)
                .single()
                .execute()
                .data
            )
        except:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Prompt Model not found"
            )
        try:
            if version == "deploy":
                # get published, ab_test prompt_model_versions
                deployed_prompt_model_versions = (
                    supabase.table("deployed_prompt_model_version")
                    .select(
                        "uuid, from_version, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
                    )
                    .eq("prompt_model_uuid", prompt_model["uuid"])
                    .execute()
                    .data
                )

                versions_uuid_list = [x["uuid"] for x in deployed_prompt_model_versions]
                # get prompts
                prompts = (
                    supabase.table("prompt")
                    .select("version_uuid, role, step, content")
                    .in_("version_uuid", versions_uuid_list)
                    .execute()
                    .data
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
                        supabase.table("prompt_model_version")
                        .select(
                            "uuid, from_version, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
                        )
                        .eq("prompt_model_uuid", prompt_model["uuid"])
                        .eq("version", version)
                        .execute()
                        .data
                    )
                elif version == "latest":
                    prompt_model_versions = (
                        supabase.table("prompt_model_version")
                        .select(
                            "uuid, from_version, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
                        )
                        .eq("prompt_model_uuid", prompt_model["uuid"])
                        .order("version", desc=True)
                        .limit(1)
                        .execute()
                        .data
                    )

                versions_uuid_list = [x["uuid"] for x in prompt_model_versions]
                # get prompts
                prompts = (
                    supabase.table("prompt")
                    .select("version_uuid, role, step, content")
                    .in_("version_uuid", versions_uuid_list)
                    .execute()
                    .data
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
                    supabase.table("chat_log_session")
                    .select("version_uuid")
                    .eq("uuid", session_uuid)
                    .single()
                    .execute()
                    .data
                )
            except:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND, detail="Session not found"
                )

            session_chat_model_version = (
                supabase.table("chat_model_version")
                .select(
                    "uuid, from_version, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("uuid", session["version_uuid"])
                .execute()
                .data
            )
            # find chat logs
            chat_logs = (
                supabase.table("chat_log")
                .select("role, name, content, tool_calls")
                .eq("session_uuid", session_uuid)
                .order("created_at", desc=False)
                .execute()
                .data
            )

            res = {
                "chat_model_versions": session_chat_model_version,
                "chat_logs": chat_logs,
            }
        elif isinstance(version, int):
            # find chat_model_version
            try:
                chat_model = (
                    supabase.table("chat_model")
                    .select("uuid, name")
                    .eq("project_uuid", project["uuid"])
                    .eq("name", chat_model_name)
                    .single()
                    .execute()
                    .data
                )
            except:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND, detail="Chat Model not found"
                )

            chat_model_version = (
                supabase.table("chat_model_version")
                .select(
                    "uuid, from_version, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("chat_model_uuid", chat_model["uuid"])
                .eq("version", version)
                .execute()
                .data
            )
            res = {"chat_model_versions": chat_model_version, "chat_logs": []}
        else:
            try:
                chat_model = (
                    supabase.table("chat_model")
                    .select("uuid, name")
                    .eq("project_uuid", project["uuid"])
                    .eq("name", chat_model_name)
                    .single()
                    .execute()
                    .data
                )
            except:
                raise HTTPException(
                    status_code=HTTP_404_NOT_FOUND, detail="Chat Model not found"
                )

            # get published, ab_test chat_model_versions
            deployed_chat_model_versions = (
                supabase.table("deployed_chat_model_version")
                .select(
                    "uuid, from_version, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("chat_model_uuid", chat_model["uuid"])
                .execute()
                .data
            )

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
    websocket: WebSocket, token: str = Depends(get_websocket_token)
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
async def connect_cli_project(project_uuid: str, api_key: str = Depends(get_api_key)):
    """Update cli token for project."""
    try:
        project = (
            supabase.table("project")
            .select("cli_access_key, online")
            .eq("uuid", project_uuid)
            .execute()
            .data
        )

        if project[0]["online"] is True:
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN, detail="Already connected"
            )
        else:
            # update project
            res = (
                supabase.table("project")
                .update(
                    {
                        "cli_access_key": api_key,
                    }
                )
                .eq("uuid", project_uuid)
                .execute()
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
):
    try:
        changelogs = []
        instances_in_db = (
            supabase.rpc("pull_instances", {"project_uuid": project_uuid})
            .execute()
            .data[0]
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
        new_instances = (
            supabase.rpc(
                "save_instances",
                {
                    "prompt_models": prompt_models_to_add,
                    "chat_models": chat_models_to_add,
                    "sample_inputs": samples_to_add,
                    "function_schemas": schemas_to_add,
                },
            )
            .execute()
            .data[0]
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
            supabase.rpc(
                "update_instances",
                {
                    "input_project_uuid": project_uuid,
                    "prompt_model_names": prompt_model_name_list_to_update,
                    "chat_model_names": chat_model_name_list_to_update,
                    "sample_input_names": [x["name"] for x in samples],
                    "function_schema_names": [x["name"] for x in function_schemas],
                    "sample_inputs": samples_to_update,
                    "function_schemas": schemas_to_update,
                },
            )
            .execute()
            .data[0]
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
        # save changelog
        if len(changelogs) > 0:
            (
                supabase.table("project_changelog")
                .insert(
                    {
                        "logs": changelogs,
                        "project_uuid": project_uuid,
                    }
                )
                .execute()
            )

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
):
    try:
        if type == InstanceType.RunLog.value:
            if not identifier:
                identifier = str(uuid4())
                run_log_to_insert = content
                run_log_to_insert["metadata"] = metadata
                run_log_to_insert["uuid"] = identifier
                try:
                    # check ["uuid", "version_uuid"] in content
                    if "uuid" not in content or "version_uuid" not in content:
                        raise Exception
                    (supabase.table("run_log").insert(run_log_to_insert).execute())
                except Exception as exc:
                    raise HTTPException(
                        status_code=HTTP_406_NOT_ACCEPTABLE,
                        detail="RunLog Content Column is not valid",
                    )
            else:
                try:
                    original_value = (
                        supabase.table("run_log")
                        .select("uuid, metadata")
                        .eq("uuid", identifier)
                        .single()
                        .execute()
                        .data
                    )
                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"RunLog Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["metadata"]
                    if original_value["metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value
                supabase.table("run_log").update({"metadata": new_metadata}).eq(
                    "uuid", identifier
                ).execute()

        elif type == InstanceType.ChatLog.value:
            if not identifier:
                identifier = str(uuid4())
                chat_log_to_insert = content
                chat_log_to_insert["metadata"] = metadata
                chat_log_to_insert["uuid"] = identifier
                try:
                    if (
                        "uuid" not in content
                        or "role" not in content
                        or "session_uuid" not in content
                    ):
                        raise Exception
                    supabase.table("chat_log").insert(chat_log_to_insert).execute()
                except Exception as exc:
                    raise HTTPException(
                        status_code=HTTP_406_NOT_ACCEPTABLE,
                        detail="ChatLog Content Column is not valid",
                    ) from exc
            else:
                try:
                    original_value = (
                        supabase.table("chat_log")
                        .select("uuid, metadata")
                        .eq("uuid", identifier)
                        .single()
                        .execute()
                        .data
                    )
                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"ChatLog Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["metadata"]
                    if original_value["metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value
                supabase.table("chat_log").update({"metadata": new_metadata}).eq(
                    "uuid", identifier
                ).execute()

        elif type == InstanceType.ChatLogSession.value:
            if not identifier:
                raise HTTPException(
                    status_code=HTTP_400_BAD_REQUEST, detail="Session uuid is required"
                )
            else:
                try:
                    original_value = (
                        supabase.table("chat_log_session")
                        .select("uuid, metadata")
                        .eq("uuid", identifier)
                        .single()
                        .execute()
                        .data
                    )
                except:
                    raise HTTPException(
                        status_code=HTTP_404_NOT_FOUND,
                        detail=f"Session Not found for uuid {identifier}",
                    )
                # update metadata in original_value
                new_metadata = (
                    original_value["metadata"]
                    if original_value["metadata"] is not None
                    else {}
                )
                for key, value in metadata.items():
                    new_metadata[key] = value
                supabase.table("chat_log_session").update(
                    {"metadata": new_metadata}
                ).eq("uuid", identifier).execute()

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
):
    try:
        # save log
        (
            supabase.table("run_log")
            .insert(
                {
                    "uuid": log_uuid,
                    "inputs": inputs,
                    "raw_output": api_response["choices"][0]["message"]["content"]
                    if api_response
                    else None,
                    "parsed_outputs": parsed_outputs,
                    "input_register_name": None,
                    "run_from_deployment": True,
                    "version_uuid": version_uuid,
                    "token_usage": api_response["usage"] if api_response else None,
                    "latency": api_response["response_ms"] if api_response else None,
                    "cost": completion_cost(api_response) if api_response else None,
                    "metadata": metadata,
                }
            )
            .execute()
        )
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
):
    try:
        print(session_uuid, type(session_uuid))
        print(log_uuid_list, type(log_uuid_list))
        print(version_uuid, type(version_uuid))
        print(messages, type(messages))
        print(metadata, type(metadata))
        # check session
        session = (
            supabase.table("chat_log_session")
            .select("*")
            .eq("uuid", session_uuid)
            .single()
            .execute()
            .data
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
                {
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
                    "metadata": meta,
                }
            )
        # save logs
        (supabase.table("chat_log").insert(logs).execute())
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
):
    try:
        # check version
        version = (
            supabase.table("chat_model_version")
            .select("*")
            .eq("uuid", version_uuid)
            .single()
            .execute()
            .data
        )
        if len(version) == 0:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="Chat Model Version not found"
            )
        # make Session
        (
            supabase.table("chat_log_session")
            .insert({"uuid": session_uuid, "version_uuid": version_uuid})
            .execute()
        )
    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
