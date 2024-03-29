"""APIs for ChatModel"""
from typing import Annotated, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete

from fastapi import APIRouter, HTTPException, Depends
from starlette import status as status_code

from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models.chat_model import ChatModelInstance, CreateChatModelBody

router = APIRouter()


# ChatModel Endpoints
@router.get("", response_model=List[ChatModelInstance])
async def fetch_chat_models(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    chat_models: List[ChatModelInstance] = [
        ChatModelInstance(**chat_model.model_dump())
        for chat_model in (
            await session.execute(
                select(ChatModel)
                .where(ChatModel.project_uuid == project_uuid)
                .order_by(desc(ChatModel.created_at))
            )
        )
        .scalars()
        .all()
    ]
    return chat_models
    


@router.post("", response_model=ChatModelInstance)
async def create_chat_model(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateChatModelBody,
    session: AsyncSession = Depends(get_session),
):
    user_auth_check = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == body.project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

    # check same name
    chat_model_in_db = (
        await session.execute(
            select(ChatModel)
            .where(ChatModel.name == body.name)
            .where(ChatModel.project_uuid == body.project_uuid)
        )
    ).scalar_one_or_none()
    if chat_model_in_db:
        raise HTTPException(
            status_code=status_code.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Same name in project",
        )
    new_chat_model = ChatModel(name=body.name, project_uuid=body.project_uuid)
    session.add(new_chat_model)
    await session.commit()
    await session.refresh(new_chat_model)
    return ChatModelInstance(**new_chat_model.model_dump())



@router.patch("/{uuid}", response_model=ChatModelInstance)
async def edit_chat_model_name(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    updated_chat_model = (
        (
            await session.execute(
                update(ChatModel)
                .where(ChatModel.uuid == uuid)
                .values(name=name)
                .returning(ChatModel)
            )
        )
        .scalar_one()
        .model_dump()
    )
    await session.commit()
    return ChatModelInstance(**updated_chat_model)



@router.delete("/{uuid}", response_model=ChatModelInstance)
async def delete_chat_model(
    jwt: Annotated[str, Depends(get_jwt)],
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    user_auth_check = (
        await session.execute(
            select(ChatModel)
            .join(Project, ChatModel.project_uuid == Project.uuid)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(ChatModel.uuid == uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

    deleted_chat_model = (
        (
            await session.execute(
                delete(ChatModel).where(ChatModel.uuid == uuid).returning(ChatModel)
            )
        )
        .scalar_one()
        .model_dump()
    )

    await session.commit()
    return ChatModelInstance(**deleted_chat_model)

