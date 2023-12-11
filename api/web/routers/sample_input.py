"""APIs for SampleInput"""
from datetime import datetime
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import SampleInputInstance, CreateSampleInputBody

router = APIRouter()


# SampleInput Endpoints
@router.get("", response_model=List[SampleInputInstance])
async def fetch_sample_inputs(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        sample_inputs: List[Dict] = [
            SampleInputInstance(**sample_input.model_dump())
            for sample_input in (
                await session.execute(
                    select(SampleInput)
                    .where(SampleInput.project_uuid == project_uuid)
                    .order_by(desc(SampleInput.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return sample_inputs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("", response_model=SampleInputInstance)
async def create_sample_input(
    body: CreateSampleInputBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check if same name in project
        sample_input_in_db = (
            await session.execute(
                select(SampleInput)
                .where(SampleInput.name == body.name)
                .where(SampleInput.project_uuid == body.project_uuid)
            )
        ).scalar_one_or_none()

        if sample_input_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )

        new_sample_input = SampleInput(**body.model_dump())
        session.add(new_sample_input)
        await session.commit()
        await session.refresh(new_sample_input)

        return SampleInputInstance(**new_sample_input.model_dump())
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
