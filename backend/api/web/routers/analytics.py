# analytics Endpoints

"""APIs for metrics"""
from typing import List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import DailyRunLogMetricInstance, DailyChatLogMetricInstance
from utils.security import JWT

router = APIRouter()


@router.get("/function_model", response_model=List[DailyRunLogMetricInstance])
async def fetch_daily_run_log_metrics(
    function_model_uuid: str,
    start_day: str,
    end_day: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        metrics: List[DailyRunLogMetricInstance] = (
            (
                await session.execute(
                    select(DailyRunLogMetric)
                    .where(DailyRunLogMetric.function_model_uuid == function_model_uuid)
                    .where(
                        DailyRunLogMetric.day
                        >= datetime.strptime(start_day, "%Y-%m-%dT%H:%M:%S.%fZ").date()
                    )
                    .where(
                        DailyRunLogMetric.day
                        <= datetime.strptime(end_day, "%Y-%m-%dT%H:%M:%S.%fZ").date()
                    )
                    .order_by(asc(DailyRunLogMetric.day))
                )
            )
            .scalars()
            .all()
        )

        metrics: List[DailyRunLogMetricInstance] = [
            DailyRunLogMetricInstance(**metric.model_dump())
            for metric in (
                await session.execute(
                    select(DailyRunLogMetric)
                    .where(DailyRunLogMetric.function_model_uuid == function_model_uuid)
                    .where(
                        DailyRunLogMetric.day
                        >= datetime.strptime(start_day, "%Y-%m-%dT%H:%M:%S.%fZ").date()
                    )
                    .where(
                        DailyRunLogMetric.day
                        <= datetime.strptime(end_day, "%Y-%m-%dT%H:%M:%S.%fZ").date()
                    )
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


@router.get("/chat_model", response_model=List[DailyChatLogMetricInstance])
async def fetch_daily_chat_log_metrics(
    chat_model_uuid: str,
    start_day: str,
    end_day: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        metrics: List[DailyChatLogMetricInstance] = [
            DailyChatLogMetricInstance(**metric.model_dump())
            for metric in (
                await session.execute(
                    select(DailyChatLogMetric)
                    .where(DailyChatLogMetric.chat_model_uuid == chat_model_uuid)
                    .where(
                        DailyChatLogMetric.day
                        >= datetime.strptime(start_day, "%Y-%m-%dT%H:%M:%S.%fZ").date()
                    )
                    .where(
                        DailyChatLogMetric.day
                        <= datetime.strptime(end_day, "%Y-%m-%dT%H:%M:%S.%fZ").date()
                    )
                    .order_by(asc(DailyChatLogMetric.day))
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
