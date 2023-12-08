"""APIs for CliAccess"""
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from sqlalchemy.dialects.postgresql import insert

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from utils.logger import logger

from base.database import get_session
from db_models import *
from ..models import CliAccessInstance, UpdateCliAccessKeyBody

router = APIRouter()


# CliAccess Endpoints
@router.patch("/", response_model=CliAccessInstance)
async def update_cli_access(
    cli_access: UpdateCliAccessKeyBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # update table CliAccess by user_id
        insert_query = (
            insert(CliAccess)
            .values(**cli_access.model_dump())
            .on_conflict_do_update(
                index_elements=[CliAccess.user_id],
                set_={"api_key": cli_access.api_key},
            )
            .returning(CliAccess)
        )
        updated_cli_access = (
            (await session.execute(insert_query)).scalar_one().model_dump()
        )
        await session.commit()
        return CliAccessInstance(**updated_cli_access)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
