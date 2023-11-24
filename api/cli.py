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


@router.get("/get_changelog")
async def get_changelog(
    project_uuid: str,
    local_project_version: str,
    levels: List[int] = Query(...),
    user_id: str = Depends(get_cli_user_id),
):
    """Get changelog of project after a certain version

    Args:
        - project_uuid (str): uuid of project
        - local_project_version (str): version of local project
        - levels (list[int]): levels of changelog to fetch

    """
    try:
        # changelog가 없을 수 있음
        start_point = (
            supabase.table("project_changelog")
            .select("id")
            .eq("project_uuid", project_uuid)
            .eq("previous_version", local_project_version)
            .execute()
            .data
        )

        if (len(start_point)) == 0:
            return JSONResponse([], status_code=HTTP_200_OK)

        current_version_id = start_point[0]["id"]

        res = (
            supabase.table("project_changelog")
            .select("previous_version, logs, level")
            .eq("project_uuid", project_uuid)
            .gte("id", current_version_id)
            .in_("level", levels)
            .order("created_at", desc=False)
            .execute()
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/check_update")
async def check_update(cached_version: str, project: dict = Depends(get_project)):
    """
    Check version between local Cache and cloud,
    If local version is lower than cloud, return (True, New Version, project_status)
    Else return (False, New Version, None)

    Input:
        - cached_version: local cached version

    Return:
        - need_update: bool
        - version : str
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


@router.get("/fetch_published_prompt_model_version")
async def fetch_published_prompt_model_version(
    prompt_model_name: str, project: dict = Depends(get_project)
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

        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/fetch_published_chat_model_version")
async def fetch_published_chat_model_version(
    chat_model_name: str,
    session_uuid: Optional[str] = None,
    project: dict = Depends(get_project),
):
    """
    ChatModel Always use this function when use_cache = True or False
    Find published version of chat_model_version

    Input:
        - chat_model_name: name of chat_model
        - session_uuid: uuid of session

    Return:
        - chat_model_versions : List[Dict]
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
            res = {
                "chat_model_versions": session_chat_model_version,
            }
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
            # get published, ab_test prompt_model_versions
            deployed_chat_model_versions = (
                supabase.table("deployed_chat_model_version")
                .select(
                    "uuid, from_uuid, chat_model_uuid, model, is_published, is_ab_test, ratio, system_prompt"
                )
                .eq("chat_model_uuid", chat_model["uuid"])
                .execute()
                .data
            )

            res = {
                "chat_model_versions": deployed_chat_model_versions,
            }

        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/fetch_chat_logs")
async def fetch_chat_logs(session_uuid: str, project: dict = Depends(get_project)):
    """
    Fetch chat logs from cloud

    Input:
        - session_uuid: uuid of session

    Return:
        - chat_logs : List[Dict]
    """
    try:
        # find chat_model
        chat_logs = (
            supabase.table("chat_log")
            .select("*")
            .eq("session_uuid", session_uuid)
            .order("created_at", desc=False)
            .execute()
            .data
        )

        res = {
            "chat_logs": chat_logs,
        }

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
                .eq("id", project["id"])
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
            # make session
            session = (
                supabase.table("session")
                .insert(
                    {
                        "uuid": session_uuid,
                        "version_uuid": version_uuid,
                        "run_from_deployment": True,
                    }
                )
                .execute()
            )
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
