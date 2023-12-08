"""APIs for FunctionSchema"""
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from modules.types import PMObject
from db_models import *
from ..models import FunctionSchemaInstance

router = APIRouter()


# FunctionSchema Endpoints
@router.get("/", response_model=List[FunctionSchemaInstance])
async def fetch_function_schemas(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        function_schemas: List[FunctionSchemaInstance] = [
            FunctionSchemaInstance(**function_schema.model_dump())
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


@router.get("/{uuid}", response_model=FunctionSchemaInstance)
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
        return FunctionSchemaInstance(**function_schema)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
