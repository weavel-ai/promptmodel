"""APIs for chatmodel local connection"""
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
from utils.prompt_utils import update_dict
from base.database import supabase
from base.websocket_connection import websocket_manager, LocalTask
from modules.websocket.run_model_functions import update_db_in_chat_model_run

router = APIRouter()


class ChatLog(BaseModel):
    role: str
    content: str
    function_call: Optional[Dict[str, Any]] = None


class ChatModelRunConfig(BaseModel):
    chat_model_uuid: str
    system_prompt: str
    new_messages: List[ChatLog]
    session_uuid: Optional[str] = None
    model: Optional[str] = "gpt-3.5-turbo"
    from_uuid: Optional[str] = None
    uuid: Optional[str] = None
    functions: Optional[List[str]] = []


@router.post("/run_chat_model")
async def run_chat_model(project_uuid: str, run_config: ChatModelRunConfig):
    """
    <h2>For local connection, Send run_chat_model request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>run_config:</b></li>
        <ul>
            <li>chat_model_uuid: chat_model uuid</li>
            <li>new_messages: list of ChatLog</li>
            <ul>
                <li>role: str</li>
                <li>content: str</li>
                <li>function_call: Dict</li>
            </ul>
            <li>system_prompt: str</li>
            <li>new_messages: List[ChatLog]</li>
            <li>session_uuid: Optional[str]</li>
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
        project = (
            supabase.table("project")
            .select("cli_access_key, version")
            .eq("uuid", project_uuid)
            .execute()
            .data
        )
        if len(project) == 0:
            raise ValueError("There is no project")
        if project[0]["cli_access_key"] is None:
            raise ValueError("There is no connection")

        cli_access_key = project[0]["cli_access_key"]

        async def run_chat_model_generator(
            cli_access_key: str, run_config: ChatModelRunConfig
        ):
            run_config_dict = run_config.model_dump()

            chat_model_version_config = {
                "chat_model_uuid": run_config.chat_model_uuid,
                "model": run_config.model,
                "from_uuid": run_config.from_uuid,
                "uuid": run_config.uuid,
                "functions": run_config.functions,
                "system_prompt": run_config.system_prompt,
            }
            session_uuid = run_config.session_uuid

            old_messages = [{"role": "system", "content": run_config.system_prompt}]
            if session_uuid:
                chat_logs: List[Dict] = (
                    supabase.table("chat_log")
                    .select("role, name, content, function_call")
                    .eq("session_uuid", session_uuid)
                    .order("created_at", desc=False)
                    .execute()
                    .data
                )
                old_messages.extend(chat_logs)
                # delete None values
                old_messages = [
                    {k: v for k, v in message.items() if v is not None}
                    for message in old_messages
                ]

            run_config_dict["old_messages"] = old_messages
            # add function schemas
            function_schemas = (
                supabase.table("function_schema")
                .select("*")
                .eq("project_uuid", project_uuid)
                .in_("name", run_config.functions)
                .execute()
            )
            run_config_dict["function_schemas"] = function_schemas.data

            new_messages = run_config.new_messages

            if chat_model_version_config["uuid"] is None:
                # find latest version
                latest_version = (
                    supabase.table("chat_model_version")
                    .select("version")
                    .eq("project_uuid", chat_model_version_config["project_uuid"])
                    .order("created_at", desc=True)
                    .execute()
                    .data
                )
                if len(latest_version) == 0:
                    chat_model_version_config["is_published"] = True
                    chat_model_version_config["version"] = 1

                    res = (
                        supabase.table("chat_model_version")
                        .insert(chat_model_version_config)
                        .execute()
                    )

                    # update project version
                    (
                        supabase.table("project")
                        .update({"version": project["version"] + 1})
                        .eq("uuid", project_uuid)
                        .execute()
                    )
                    (
                        supabase.table("project_changelog")
                        .insert(
                            [
                                {
                                    "subject": "chat_model_version",
                                    "identifier": [res.data[0]["uuid"]],
                                    "action": "ADD",
                                },
                                {
                                    "subject": "chat_model_version",
                                    "identifier": [res.data[0]["uuid"]],
                                    "action": "PUBLISH",
                                },
                            ]
                        )
                        .execute()
                    )
                else:
                    chat_model_version_config = latest_version[0]["version"] + 1

                    res = (
                        supabase.table("chat_model_version")
                        .insert(chat_model_version_config)
                        .execute()
                    )
                    (
                        supabase.table("project_changelog")
                        .insert(
                            {
                                "subject": "chat_model_version",
                                "identifier": [res.data[0]["uuid"]],
                                "action": "ADD",
                            }
                        )
                        .execute()
                    )

                chat_model_version_config["uuid"] = res.data[0]["uuid"]

            # make session
            if session_uuid is None:
                res = (
                    supabase.table("chat_log_session")
                    .insert(
                        {
                            "version_uuid": chat_model_version_config["uuid"],
                        }
                    )
                    .execute()
                )
                session_uuid = res.data[0]["uuid"]

            # save new messages
            for message in new_messages:
                message["session_uuid"] = session_uuid
            supabase.table("chat_log").insert(new_messages).execute()

            response_messages = []
            current_message = {
                "role": "assistant",
                "content": "",
                "function_call": None,
            }

            res = websocket_manager.stream(
                cli_access_key, LocalTask.RUN_CHAT_MODEL, run_config_dict
            )

            async for chunk in res:
                if "status" in chunk:
                    if "raw_output" in chunk:
                        current_message["content"] += chunk["raw_output"]
                    if "function_call" in chunk:
                        if current_message["function_call"] is None:
                            current_message["function_call"] = chunk["function_call"]
                        else:
                            current_message["function_call"] = update_dict(
                                current_message["function_call"], chunk["function_call"]
                            )

                    if "function_response" in chunk:
                        response_messages.append(current_message)
                        current_message = {
                            "role": "assistant",
                            "content": "",
                            "function_call": None,
                        }
                        response_messages.append(
                            {
                                "role": "function",
                                "name": chunk["function_response"]["name"],
                                "content": chunk["function_response"]["response"],
                            }
                        )

                    if chunk["status"] in ["completed", "failed"]:
                        if (
                            current_message["content"] != ""
                            or current_message["function_call"] is not None
                        ):
                            response_messages.append(current_message)

                        update_db_in_chat_model_run(
                            chat_model_version_config,
                            session_uuid,
                            new_messages,
                            response_messages,
                            chunk["error_type"],
                            chunk["log"],
                        )
                yield json.dumps(chunk)

        try:
            return StreamingResponse(
                run_chat_model_generator(cli_access_key, run_config)
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
async def list_chat_models(project_uuid: str):
    """Get list of chat models in local DB by websocket
    Input:
        - project_uuid : project uuid

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
        project = (
            supabase.table("project")
            .select("cli_access_key")
            .eq("uuid", project_uuid)
            .execute()
            .data
        )
        if len(project) == 0:
            raise ValueError("There is no project")
        if project[0]["cli_access_key"] is None:
            raise ValueError("There is no connection")

        cli_access_key = project[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_CODE_CHAT_MODELS
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
