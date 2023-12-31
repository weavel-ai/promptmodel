"""APIs for Tags"""
from datetime import datetime
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models.tags import TagsInstance, CreateTagsBody

router = APIRouter()


# Tags Endpoints
@router.get("", response_model=List[TagsInstance])
async def fetch_tags(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    tags: List[TagsInstance] = [
        TagsInstance(**tag.model_dump())
        for tag in (
            await session.execute(
                select(Tag)
                .where(Tag.project_uuid == project_uuid)
                .order_by(asc(Tag.name))
            )
        )
        .scalars()
        .all()
    ]
    return tags



@router.post("", response_model=TagsInstance)
async def create_tag(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateTagsBody,
    session: AsyncSession = Depends(get_session),
):
    # check if same name in project
    tag_in_db = (
        await session.execute(
            select(Tag)
            .where(Tag.name == body.name)
            .where(Tag.project_uuid == body.project_uuid)
        )
    ).scalar_one_or_none()

    if tag_in_db:
        raise HTTPException(
            status_code=status_code.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Same name in project",
        )

    new_tag = Tag(**body.model_dump())
    session.add(new_tag)
    await session.commit()
    await session.refresh(new_tag)

    return TagsInstance(**new_tag.model_dump())

