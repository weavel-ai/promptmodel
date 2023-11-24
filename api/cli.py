"""APIs for package management"""
import asyncio
from operator import truediv

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
)

from utils.security import get_api_key, get_project, get_cli_user_id
from utils.dependency import get_websocket_token
from utils.logger import logger
from base.database import supabase
from base.websocket_connection import websocket_manager
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
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
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
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
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
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


# @router.get("/get_changelog")
# async def get_changelog(
#     project_uuid: str,
#     local_project_version: str,
#     levels: List[int] = Query(...),
#     user_id: str = Depends(get_cli_user_id),
# ):
#     """Get changelog of project after a certain version

#     Args:
#         - project_uuid (str): uuid of project
#         - local_project_version (str): version of local project
#         - levels (list[int]): levels of changelog to fetch

#     """
#     try:
#         # changelog가 없을 수 있음
#         start_point = (
#             supabase.table("project_changelog")
#             .select("id")
#             .eq("project_uuid", project_uuid)
#             .eq("previous_version", local_project_version)
#             .execute()
#             .data
#         )

#         if (len(start_point)) == 0:
#             return JSONResponse([], status_code=HTTP_200_OK)

#         current_version_id = start_point[0]["id"]

#         res = (
#             supabase.table("project_changelog")
#             .select("previous_version, logs, level")
#             .eq("project_uuid", project_uuid)
#             .gte("id", current_version_id)
#             .in_("level", levels)
#             .order("created_at", desc=False)
#             .execute()
#         )
#         return JSONResponse(res.data, status_code=HTTP_200_OK)
#     except Exception as exc:
#         logger.error(exc)
#         raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


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
                "uuid, from_uuid, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
            )
            # .select("uuid, from_uuid, prompt_model_uuid, model, is_published, is_ab_test, ratio")
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
        prompt_model = (
            supabase.table("prompt_model")
            .select("uuid, name")
            .eq("project_uuid", project["uuid"])
            .eq("name", prompt_model_name)
            .single()
            .execute()
            .data
        )
        if version == "deploy":
            # get published, ab_test prompt_model_versions
            deployed_prompt_model_versions = (
                supabase.table("deployed_prompt_model_version")
                .select(
                    "uuid, from_uuid, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
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
            if isinstance(version, int):
                prompt_model_versions = (
                    supabase.table("prompt_model_version")
                    .select(
                        "uuid, from_uuid, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
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
                        "uuid, from_uuid, prompt_model_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys"
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
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


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
        # find chat_model
        if session_uuid:
            # find session's chat_model & version
            session = (
                supabase.table("chat_log_session")
                .select("version_uuid")
                .eq("uuid", session_uuid)
                .single()
                .execute()
                .data
            )
            session_chat_model_version = (
                supabase.table("chat_model_version")
                .select(
                    "uuid, from_uuid, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("uuid", session["version_uuid"])
                .execute()
                .data
            )
            # find chat logs
            chat_logs = (
                supabase.table("chat_log")
                .select("*")
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
            chat_model = (
                supabase.table("chat_model")
                .select("uuid, name")
                .eq("project_uuid", project["uuid"])
                .eq("name", chat_model_name)
                .single()
                .execute()
                .data
            )

            chat_model_version = (
                supabase.table("chat_model_version")
                .select(
                    "uuid, from_uuid, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("chat_model_uuid", chat_model["uuid"])
                .eq("version", version)
                .execute()
                .data
            )
            res = {"chat_model_versions": chat_model_version, "chat_logs": []}
        else:
            chat_model = (
                supabase.table("chat_model")
                .select("uuid, name")
                .eq("project_uuid", project["uuid"])
                .eq("name", chat_model_name)
                .single()
                .execute()
                .data
            )
            # get published, ab_test chat_model_versions
            deployed_chat_model_versions = (
                supabase.table("deployed_chat_model_version")
                .select(
                    "uuid, from_uuid, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("chat_model_uuid", chat_model["uuid"])
                .execute()
                .data
            )

            res = {"chat_model_versions": deployed_chat_model_versions, "chat_logs": []}

        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


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
            .select("cli_access_key")
            .eq("uuid", project_uuid)
            .execute()
            .data
        )

        if project[0]["cli_access_key"] is not None:
            return HTTPException(
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
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/log_deployment_run")
async def log_deployment_run(
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
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/log_deployment_chat")
async def log_deployment_chat(
    session_uuid: str,
    version_uuid: str,
    messages: List[Dict[str, Any]] = [],
    metadata: Optional[List[Dict[str, Any]]] = None,
    project: dict = Depends(get_project),
):
    try:
        # check session
        session = (
            supabase.table("session")
            .select("*")
            .eq("uuid", session_uuid)
            .single()
            .execute()
            .data
        )
        if len(session) == 0:
            raise ValueError("Session not found")
        # make logs
        logs = []
        for message, meta in zip(messages, metadata):
            token_usage = meta["token_usage"] if meta else None
            latency = meta["response_ms"] if meta else None
            cost = completion_cost(meta["api_response"]) if meta else None
            if "token_usage" in meta:
                del meta["token_usage"]
            if "response_ms" in meta:
                del meta["response_ms"]
            logs.append(
                {
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
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


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
            raise ValueError("Chat Model Version not found")
        # make Session
        (
            supabase.table("chat_log_session")
            .insert({"uuid": session_uuid, "version_uuid": version_uuid})
            .execute()
        )
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


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
        # for PromptModel
        prompt_models_in_db = (
            supabase.table("prompt_model")
            .select("uuid, name")
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        old_names = [x["name"] for x in prompt_models_in_db]
        new_names = list(set(prompt_models) - set(old_names))
        new_prompt_models = [
            {"name": x, "project_uuid": project_uuid} for x in new_names
        ]
        # insert new prompt_models
        if len(new_prompt_models) > 0:
            new_versions = (
                supabase.table("prompt_model").insert(new_prompt_models).execute().data
            )
            changelogs.append(
                {
                    "subject": f"prompt_model",
                    "identifiers": [version["uuid"] for version in new_versions],
                    "action": "ADD",
                }
            )
        if len(prompt_models) > 0:
            supabase.table("prompt_model").update({"online": True}).eq(
                "project_uuid", project_uuid
            ).in_("name", prompt_models).execute()

        # for ChatModel
        chat_models_in_db = (
            supabase.table("chat_model")
            .select("uuid, name")
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        old_names = [x["name"] for x in chat_models_in_db]
        new_names = list(set(chat_models) - set(old_names))
        new_chat_models = [{"name": x, "project_uuid": project_uuid} for x in new_names]
        # insert new chat_models
        if len(new_chat_models) > 0:
            new_versions = (
                supabase.table("chat_model").insert(new_chat_models).execute().data
            )
            changelogs.append(
                {
                    "subject": f"chat_model",
                    "identifiers": [version["uuid"] for version in new_versions],
                    "action": "ADD",
                }
            )
        if len(chat_models) > 0:
            supabase.table("chat_model").update({"online": True}).eq(
                "project_uuid", project_uuid
            ).in_("name", chat_models).execute()

        # For Sample
        samples_in_db = (
            supabase.table("sample_input")
            .select("*")
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        old_names = [x["name"] for x in samples_in_db]
        names_in_code = [x["name"] for x in samples]
        new_names = list(set(names_in_code) - set(old_names))
        new_samples = [
            {
                "name": x["name"],
                "content": x["content"],
                "project_uuid": project_uuid,
            }
            for x in samples
            if x["name"] in new_names
        ]
        # insert new samples
        if len(new_samples) > 0:
            new_samples = (
                supabase.table("sample_input").insert(new_samples).execute().data
            )
            changelogs.append(
                {
                    "subject": f"sample_input",
                    "identifiers": [sample["uuid"] for sample in new_samples],
                    "action": "ADD",
                }
            )

        # sample to update
        samples_to_update = [
            sample
            for sample in samples
            if sample["name"] not in new_names
            and sample["content"]
            != samples_in_db[old_names.index(sample["name"])]["content"]
        ]
        if len(samples_to_update) > 0:
            update_sample_uuids = []
            for sample in samples_to_update:
                res = (
                    supabase.table("sample_input")
                    .update({"content": sample["content"]})
                    .eq("project_uuid", project_uuid)
                    .eq("name", sample["name"])
                    .execute()
                    .data
                )
                update_sample_uuids.append(res[0]["uuid"])
            changelogs.append(
                {
                    "subject": f"sample_input",
                    "identifiers": update_sample_uuids,
                    "action": "UPDATE",
                }
            )
        if len(samples) > 0:
            supabase.table("sample_input").update({"online": True}).eq(
                "project_uuid", project_uuid
            ).in_("name", names_in_code).execute()

        # For FunctionSchema
        schemas_in_db = (
            supabase.table("function_schema")
            .select("*")
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        old_names = [x["name"] for x in schemas_in_db]
        names_in_code = [x["name"] for x in function_schemas]
        new_names = list(set(names_in_code) - set(old_names))
        new_schemas = [
            {
                "name": x["name"],
                "description": x["description"],
                "parameter": x["parameter"],
                "mock_response": x["mock_response"] if "mock_response" in x else None,
                "project_uuid": project_uuid,
            }
            for x in function_schemas
            if x["name"] in new_names
        ]
        # insert new schemas
        if len(new_schemas) > 0:
            res = supabase.table("function_schema").insert(new_schemas).execute().data
            changelogs.append(
                {
                    "subject": f"function_schema",
                    "identifiers": [schema["uuid"] for schema in res],
                    "action": "ADD",
                }
            )

        # update schemas
        schema_to_update = [
            schema for schema in function_schemas if schema["name"] not in new_names
        ]
        if len(schema_to_update) > 0:
            update_schema_uuids = []
            for schema in schema_to_update:
                res = (
                    supabase.table("function_schema")
                    .update(
                        {
                            "description": schema["description"],
                            "parameter": schema["parameter"],
                            "mock_response": schema["mock_response"],
                        }
                    )
                    .eq("project_uuid", project_uuid)
                    .eq("name", schema["name"])
                    .execute()
                    .data
                )
                update_schema_uuids.append(res[0]["uuid"])
            changelogs.append(
                {
                    "subject": f"function_schema",
                    "identifiers": update_schema_uuids,
                    "action": "UPDATE",
                }
            )
        if len(function_schemas) > 0:
            supabase.table("function_schema").update({"online": True}).eq(
                "project_uuid", project_uuid
            ).in_("name", names_in_code).execute()

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
