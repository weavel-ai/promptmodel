"""APIs for promptmodel local connection"""
import json
from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

from fastapi import APIRouter, Response, HTTPException, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_500_INTERNAL_SERVER_ERROR,
    HTTP_404_NOT_FOUND,
    HTTP_406_NOT_ACCEPTABLE,
)

from utils.security import get_project
from utils.prompt_utils import update_dict
from utils.logger import logger

# from base.database import supabase
from base.websocket_connection import websocket_manager, LocalTask
from modules.websocket.run_model_generators import run_local_prompt_model_generator
from .dev_chat import router as chat_router
from modules.types import PromptConfig, PromptModelRunConfig

router = APIRouter()
router.include_router(chat_router)


@router.post("/run_prompt_model")
async def run_prompt_model(project_uuid: str, run_config: PromptModelRunConfig):
    """
    <h2>Send run_prompt_model request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>run_config:</b></li>
        <ul>
            prompt_model_uuid: str
            prompts: List of prompts (type, step, content)
            model: str
            from_version: previous version number (Optional)
            version_uuid: current version uuid (Optional if from_version is provided)
            sample_name: Sample name (Optional)
            parsing_type: ParsingType (colon, square_bracket, double_square_bracket, html)
            output_keys: List of output keys (Optional)
            functions: List of function schemas (Optional)
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
            .select("cli_access_key, version, uuid")
            .eq("uuid", project_uuid)
            .execute()
            .data
        )
        if len(project) == 0:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="There is no project"
            )
        if project[0]["cli_access_key"] is None:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="There is no connection"
            )

        cli_access_key = project[0]["cli_access_key"]

        try:
            return StreamingResponse(
                run_local_prompt_model_generator(project[0], cli_access_key, run_config)
            )
        except Exception as exc:
            logger.error(exc)
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


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
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="There is no project"
            )
        if project[0]["cli_access_key"] is None:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="There is no connection"
            )

        cli_access_key = project[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_CODE_PROMPT_MODELS
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


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
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="There is no project"
            )
        if project[0]["cli_access_key"] is None:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND, detail="There is no connection"
            )

        cli_access_key = project[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_CODE_FUNCTIONS
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
