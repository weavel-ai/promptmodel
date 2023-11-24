"""APIs for promptmodel local connection"""
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
from utils.prompt_utils import update_dict
from utils.logger import logger
from base.database import supabase
from base.websocket_connection import websocket_manager, LocalTask
from modules.websocket.run_model_functions import (
    validate_variable_matching,
    update_db_in_prompt_model_run,
    MessagesWithInputs,
)
from .dev_chat import router as chat_router

router = APIRouter()
router.include_router(chat_router)


class PromptConfig(BaseModel):
    role: str
    step: int
    content: str


class PromptModelRunConfig(BaseModel):
    prompt_model_uuid: str
    prompts: List[PromptConfig]
    model: Optional[str] = "gpt-3.5-turbo"
    from_uuid: Optional[str] = None
    uuid: Optional[str] = None
    sample_name: Optional[str] = None
    parsing_type: Optional[str] = None
    output_keys: Optional[List[str]] = None
    functions: Optional[List[str]] = []


class ChatModelRunConfig(BaseModel):
    system_prompt: str
    user_input: str
    model: Optional[str] = "gpt-3.5-turbo"
    chat_model_uuid: Optional[str] = None
    from_uuid: Optional[str] = None
    session_uuid: Optional[str] = None
    version_uuid: Optional[str] = None
    functions: Optional[List[str]] = []


class RunLog(BaseModel):
    inputs: Dict[str, Any]
    raw_output: str
    parsed_outputs: Dict[str, Any]


@router.post("/run_prompt_model")
async def run_prompt_model(project_uuid: str, run_config: PromptModelRunConfig):
    """
    <h2>Send run_prompt_model request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>run_config:</b></li>
        <ul>
            <li>prompt_model_uuid: prompt_model uuid</li>
            <li>output_keys: List[str] | None (Optional)</li>
            <li>model: model name</li>
            <li>sample_name : sample name (Optional)  </li>
            <li>prompts : list of prompts (type, step, content)  </li>
            <li>from_uuid : previous version uuid (Optional) </li>
            <li>uuid : current uuid (optional if run_previous)  </li>
            <li>parsing_type: parsing type (colon, square_bracket, double_square_bracket, html, None)  </li>
            <li>functions : list of function names (Optional[List[str]])  </li>
        </ul>
    </ul>

    <h3>Output:</h3>
    <ul>
        <li><b>StreamingResponse  </b></li>
        <ul>
        <li>raw_output: str  </li>
        <li>parsed_outputs: dict  </li>
        <li>status: str = completed | failed | running  </li>
        <li>function_call: dict </li>
        </ul>
    </ul>
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
        run_config_dict = run_config.model_dump()

        # Validate Variable Matching
        messages_with_inputs: MessagesWithInputs = validate_variable_matching(
            run_config_dict, project_uuid
        )
        if messages_with_inputs.error:
            raise ValueError(messages_with_inputs.error_message)

        async def run_prompt_model_generator(
            cli_access_key: str, run_config: PromptModelRunConfig
        ):
            run_config_dict = run_config.model_dump()
            run_config_dict["messages_for_run"] = messages_with_inputs.messages

            # add function schemas
            function_schemas = (
                supabase.table("function_schema")
                .select("*")
                .eq("project_uuid", project_uuid)
                .in_("name", run_config.functions)
                .execute()
            )  # function_schemas includes mock_response
            run_config_dict["function_schemas"] = function_schemas.data

            run_log: Dict[str, Any] = {
                "inputs": messages_with_inputs.inputs,
                "raw_output": "",
                "parsed_outputs": {},
                "function_call": None,
                "input_register_name": run_config.sample_name,
                "version_uuid": run_config.uuid,
                "token_usage": None,  # TODO: add token usage, latency, cost on testing
                "latency": None,
                "cost": None,
                "metadata": None,
                "run_from_deployment": False,
            }

            prompt_model_version_config: Dict[str, Any] = {
                "version": 0,
                "uuid": run_config.uuid,
                "prompt_model_uuid": run_config.prompt_model_uuid,
                "model": run_config.model,
                "from_uuid": run_config.from_uuid,
                "parsing_type": run_config.parsing_type,
                "output_keys": run_config.output_keys,
                "functions": run_config.functions,
            }

            prompts: List[Dict[str, Any]] = run_config.prompts

            res = websocket_manager.stream(
                cli_access_key, LocalTask.RUN_PROMPT_MODEL, run_config_dict
            )
            async for chunk in res:
                # check output and update DB
                if "raw_output" in chunk:
                    run_log["raw_output"] += chunk["raw_output"]

                if "parsed_outputs" in chunk:
                    run_log["parsed_outputs"] = update_dict(
                        run_log["parsed_outputs"], chunk["parsed_outputs"]
                    )

                if "function_call" in chunk:
                    run_log["function_call"] = chunk["function_call"]

                if "function_response" in chunk:
                    run_log["function_call"]["response"] = chunk["function_response"][
                        "response"
                    ]  # TODO: if add tool call, change this to use chunk["function_response"]["name"] to find each call-response pair

                if "status" in chunk:
                    if chunk["status"] in ["completed", "failed"]:
                        update_db_in_prompt_model_run(
                            prompt_model_version_config,
                            run_log,
                            prompts,
                            chunk["error_type"],
                            chunk["log"],
                        )

                yield json.dumps(chunk)

        try:
            return StreamingResponse(
                run_prompt_model_generator(cli_access_key, run_config)
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


@router.get("/list_prompt_models")
async def list_prompt_models(project_uuid: str):
    """Get list of prompt models in local Code by websocket
    Input:
        - project_uuid : project uuid

    Output:
        Response
            - correlation_id: str
            - prompt_models: list
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
            cli_access_key, LocalTask.LIST_CODE_PROMPT_MODELS
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


@router.get("/list_functions")
async def list_functions(project_uuid: str):
    """Get list of functions in local Code by websocket
    Input:
        - project_uuid : project uuid

    Output:
        Response
            - correlation_id: str
            - prompt_models: list
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
            cli_access_key, LocalTask.LIST_CODE_FUNCTIONS
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
