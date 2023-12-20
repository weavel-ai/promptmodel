"""APIs for chatmodel local connection"""
import json
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Annotated, Any, Dict, List, Optional, Sequence, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

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
from utils.security import get_jwt

from utils.logger import logger

from base.database import get_session
from base.websocket_connection import websocket_manager, LocalTask
from modules.websocket.run_model_generators import (
    run_local_chat_model_generator,
)
from api.common.models import ChatModelRunConfig
from db_models import *

router = APIRouter()


@router.post("/run_chat_model")
async def run_chat_model(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    run_config: ChatModelRunConfig,
    session: AsyncSession = Depends(get_session),
):
    """
    <h2>For local connection, Send run_chat_model request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>run_config:</b></li>
        <ul>
            chat_model_uuid: (str)
            system_prompt: str
            user_input: str
            model: str
            from_version: previous version number (Optional)
            session_uuid: current session uuid (Optional)
            version_uuid: current version uuid (Optional if from_version is provided)
            functions: List of functions (Optional)
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
        start_timestampz_iso = datetime.now(timezone.utc)
        # Find local server websocket
        project = (
            (
                await session.execute(
                    select(
                        Project.cli_access_key,
                        Project.version,
                        Project.uuid,
                        Project.organization_id,
                    ).where(Project.uuid == project_uuid)
                )
            )
            .mappings()
            .all()
        )

        # check jwt['user_id'] have access to project_uuid
        users_orgs = (
            (
                await session.execute(
                    select(UsersOrganizations.organization_id).where(
                        UsersOrganizations.user_id == jwt["user_id"]
                    )
                )
            )
            .scalars()
            .all()
        )

        if project[0]["organization_id"] not in users_orgs:
            raise HTTPException(
                status_code=HTTP_403_FORBIDDEN,
                detail="User don't have access to this project",
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
                run_local_chat_model_generator(
                    session,
                    project[0],
                    start_timestampz_iso,
                    cli_access_key,
                    run_config,
                )
            )
        except Exception as exc:
            logger.error(exc)
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

    except HTTPException as http_exc:
        raise http_exc
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc


@router.get("/list_chat_models")
async def list_chat_models(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
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
            (
                await session.execute(
                    select(Project.cli_access_key, Project.version, Project.uuid).where(
                        Project.uuid == project_uuid
                    )
                )
            )
            .mappings()
            .all()
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
            cli_access_key, LocalTask.LIST_CODE_CHAT_MODELS
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
