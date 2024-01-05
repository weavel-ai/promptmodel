"""APIs for User Table"""
from datetime import datetime
from typing import Annotated, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code
from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models.user import UserInstance, CreateUserBody

router = APIRouter()


# User Endpoints


@router.post("", response_model=UserInstance)
async def create_clerk_user(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateUserBody,
    session: AsyncSession = Depends(get_session),
):
    new_user = User(**body.model_dump())
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return UserInstance(**new_user.model_dump())



@router.get("/{user_id}", response_model=UserInstance)
async def get_user(
    jwt: Annotated[str, Depends(get_jwt)],
    user_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        user: Dict = (
            (await session.execute(select(User).where(User.user_id == user_id)))
            .scalar_one()
            .model_dump()
        )
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=status_code.HTTP_404_NOT_FOUND,
            detail="User with given id not found",
        )
    return UserInstance(**user)

