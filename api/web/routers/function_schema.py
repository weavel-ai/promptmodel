"""APIs for promptmodel webpage"""
import re
import json
import secrets
from datetime import datetime, timezone
from operator import eq
from typing import Any, Dict, List, Optional, Annotated
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi_nextauth_jwt import NextAuthJWT
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_404_NOT_FOUND,
    HTTP_406_NOT_ACCEPTABLE,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from promptmodel.llms.llm_dev import LLMDev
from promptmodel.types.response import LLMStreamResponse

from utils.logger import logger
from utils.prompt_utils import update_dict

from base.database import get_session
from modules.types import PromptModelRunConfig, ChatModelRunConfig
from db_models import *

router = APIRouter()


# FunctionSchema Endpoints
@router.get("/")
async def fetch_function_schemas(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        function_schemas: List[Dict] = [
            function_schema.model_dump()
            for function_schema in (
                await session.execute(
                    select(FunctionSchema)
                    .where(FunctionSchema.project_uuid == project_uuid)
                    .order_by(desc(FunctionSchema.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return function_schemas
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{uuid}")
async def fetch_function_schema(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        function_schema: Dict = (
            (
                await session.execute(
                    select(FunctionSchema).where(FunctionSchema.uuid == uuid)
                )
            )
            .scalar_one()
            .model_dump()
        )
        return function_schema
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
