# analytics Endpoints

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


@router.get("/prompt_model/")
async def fetch_daily_run_log_metrics(
    prompt_model_uuid: str,
    start_day: str,
    end_day: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        metrics: List[Dict] = [
            metric.model_dump()
            for metric in (
                await session.execute(
                    select(DailyRunLogMetric)
                    .where(DailyRunLogMetric.prompt_model_uuid == prompt_model_uuid)
                    .where(DailyRunLogMetric.day >= start_day)
                    .where(DailyRunLogMetric.day <= end_day)
                    .order_by(asc(DailyRunLogMetric.day))
                )
            )
            .scalars()
            .all()
        ]
        return metrics
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/chat_model/")
async def fetch_daily_chat_log_metrics(
    chat_model_uuid: str,
    start_day: str,
    end_day: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        metrics: List[Dict] = [
            metric.model_dump()
            for metric in (
                await session.execute(
                    select(DailyChatLogMetric)
                    .where(DailyChatLogMetric.chat_model_uuid == chat_model_uuid)
                    .where(DailyChatLogMetric.day >= start_day)
                    .where(DailyChatLogMetric.day <= end_day)
                    .order_by(asc(DailyRunLogMetric.day))
                )
            )
            .scalars()
            .all()
        ]
        return metrics
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
