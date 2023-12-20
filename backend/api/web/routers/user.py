"""APIs for User Table"""
from datetime import datetime
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from utils.logger import logger

from base.database import get_session
from utils.security import JWT
from db_models import *
from ..models import UserInstance, CreateUserBody

router = APIRouter()


# User Endpoints


@router.post("", response_model=UserInstance)
async def create_clerk_user(
    body: CreateUserBody,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        new_user = User(**body.model_dump())
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return UserInstance(**new_user.model_dump())
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{user_id}", response_model=UserInstance)
async def get_user(
    user_id: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(JWT),
):
    try:
        try:
            user: Dict = (
                (await session.execute(select(User).where(User.user_id == user_id)))
                .scalar_one()
                .model_dump()
            )
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="User with given id not found",
            )
        return UserInstance(**user)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
