"""APIs for chatmodel dev page"""
import json
from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

from fastapi import APIRouter, Response, HTTPException, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.security import get_project
from utils.logger import logger
from base.database import supabase
from base.websocket_connection import websocket_manager, LocalTask

router = APIRouter()


class ChatLog(BaseModel):
    role: str
    content: str
    function_call: Optional[Dict[str, Any]] = None


class ChatModelRunConfig(BaseModel):
    chat_model_uuid: str
    chat_model_name: str
    new_messages: List[ChatLog]
    system_prompt: ChatLog
    model: Optional[str] = "gpt-3.5-turbo"
    from_uuid: Optional[str] = None
    uuid: Optional[str] = None
    functions: Optional[List[str]] = []


@router.post("/run_chat_model")
async def run_chat_model(
    project_uuid: str, dev_name: str, run_config: ChatModelRunConfig
):
    """
    <h2>For dev branch, Send run_chat_model request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>dev_name:</b> dev branch name</li>
        <li><b>run_config:</b></li>
        <ul>
            <li>chat_model_name: chat_model name</li>
            <li>chat_model_uuid: chat_model uuid</li>
            <li>new_messages: list of ChatLog</li>
            <ul>
                <li>role: str</li>
                <li>content: str</li>
                <li>function_call: Dict</li>
            </ul>
            <li>system_prompt: ChatLog</li>
            <li>model: str</li>
            <li>from_uuid: str</li>
            <li>uuid: str</li>
            <li>functions: list of str</li>
        </ul>
    </ul>

    <h3>Output:</h3>
    <ul>
        <li><b>StreamingResponse  </b></li>
        <ul>
        <li>raw_output: str  </li>
        <li>status: str = completed | failed | running  </li>
        <li>function_call: Dict </li>
        <li>function_response: Dict </li>
        </ul>
    </ul>
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")
        cli_access_key = dev_branch[0]["cli_access_key"]

        try:
            return StreamingResponse(
                websocket_manager.stream(
                    cli_access_key, LocalTask.RUN_CHAT_MODEL, run_config.model_dump()
                )
            )
        except Exception as exc:
            logger.error(exc)
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_chat_models")
async def list_chat_models(project_uuid: str, dev_name: str):
    """Get list of chat models in local DB by websocket
    Input:
        - project_uuid : project uuid
        - dev_name : dev branch name

    Output:
        Response
            - correlation_id: str
            - chat_models: list
                - used_in_code
                - is_deployed
                - uuid
                - name

    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_CHAT_MODELS
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_chat_model_versions")
async def list_chat_model_versions(
    project_uuid: str, dev_name: str, chat_model_uuid: str
):
    """Get list of chat model versions for chat_model_uuid in local DB by websocket
    Input:
        - project_uuid : project uuid
        - dev_name : dev branch name
        - chat_model_uuid : chat_model uuid

    Output:
        Response
            - correlation_id: str
            - chat_model_versions: list
                - uuid
                - from_uuid
                - chat_model_uuid
                - status
                - model
                - version
                - system_prompt
                - functions
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")
        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.LIST_CHAT_MODEL_VERSIONS,
            {"chat_model_uuid": chat_model_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_chat_log_session")
async def get_chat_log_session(
    project_uuid: str, dev_name: str, chat_model_version_uuid: str
):
    """Get list of chat_log_sessions for chat_model_version_uuid in Local DB by websocket"""
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.GET_CHAT_LOG_SESSIONS,
            {"chat_model_version_uuid": chat_model_version_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_chat_logs")
async def get_chat_logs(project_uuid: str, dev_name: str, session_uuid: str):
    """Get list of chat_logs of session_uuid in local DB by websocket

    Args:
        project_uuid (str): project_uuid
        dev_name (str): dev_name
        session_uuid (str): session_uuid

    Returns:
        Response
            - chat_logs : List[Dict]
                - session_uuid
                - role
                - content
                - function_call
                - run_from_deployment
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.GET_CHAT_LOGS,
            {"session_uuid": session_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/change_chat_model_version_status")
async def change_chat_model_version_status(
    project_uuid: str, dev_name: str, chat_model_version_uuid: str, status: str
):
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.CHANGE_CHAT_MODEL_VERSION_STATUS,
            {"chat_model_version_uuid": chat_model_version_uuid, "status": status},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc
