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

JWT = NextAuthJWT(
    secret="y0uR_SuP3r_s3cr37_$3cr3t",
)


class OrganizationBody(BaseModel):
    organization_id: str
    name: str
    user_id: str
    slug: str


# Organization Endpoints
@router.post("/organization")
async def create_organization(
    organization: OrganizationBody,
    # jwt: Annotated[dict, Depends(JWT)],
    session: AsyncSession = Depends(get_session),
):
    try:
        new_org = Organization(organization_id=organization.organization_id, name=organization.name, slug=organization.slug)
        session.add(new_org)
        await session.flush()
        await session.refresh(new_org)
        
        session.add(UsersOrganizations(user_id=organization.user_id, organization_id=new_org.organization_id))
        await session.commit()
        await session.refresh(new_org)
        
        return OrganizationBody(**new_org.model_dump())
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/organization/{id}")
async def update_organization(
    id: int,
    name: str,
    slug: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(Organization)
            .where(Organization.id == id)
            .values(name=name, slug=slug)
        )
        org: Dict = (
            (await session.execute(select(Organization).where(Organization.id == id)))
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return org
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/organization/{id}")
async def get_organization(
    id: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        org: Dict = (
            (await session.execute(select(Organization).where(Organization.id == id)))
            .scalar_one()
            .model_dump()
        )
        return org
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# User Endpoints


class UserBody(BaseModel):
    user_id: str
    email: str


@router.post("/user")
async def create_user(
    user: UserBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        new_user = User(**user.model_dump())
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        return new_user.model_dump()
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/user/{id}")
async def get_user(
    id: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        user: Dict = (
            (await session.execute(select(User).where(User.id == id)))
            .scalar_one()
            .model_dump()
        )
        return user
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# Project Endpoints


@router.post("/organization/{organization_id}/project")
async def create_project(
    organization_id: int,
    name: str,
    description: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    try:
        api_key = secrets.token_urlsafe(32)
        new_project = Project(
            name=name,
            organization_id=organization_id,
            description=description,
            api_key=api_key,
        )
        session.add(new_project)
        await session.commit()
        await session.refresh(new_project)
        return new_project.model_dump()
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/organization/{organization_id}/projects")
async def fetch_projects(
    organization_id: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        projects: List[Dict] = [
            project.model_dump()
            for project in (
                await session.execute(
                    select(Project).where(Project.organization_id == organization_id)
                )
            )
            .scalars()
            .all()
        ]
        return projects
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project/{uuid}")
async def get_project(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        project: Dict = (
            (await session.execute(select(Project).where(Project.uuid == uuid)))
            .scalar_one()
            .model_dump()
        )
        return project
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class CliAccessKeyBody(BaseModel):
    api_key: str


# CliAccess Endpoints
@router.patch("/user/{user_id}/cli_access")
async def update_cli_access(
    user_id: str,
    cli_access: CliAccessKeyBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # update table CliAccess by user_id
        await session.execute(
            update(CliAccess)
            .where(CliAccess.user_id == user_id)
            .values(api_key=cli_access.api_key)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# SampleInput Endpoints


@router.get("/project/{project_uuid}/sample_inputs")
async def fetch_sample_inputs(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        sample_inputs: List[Dict] = [
            sample_input.model_dump()
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


class SampleInputBody(BaseModel):
    name: str
    content: Dict[str, Any]


@router.post("/project/{project_uuid}/sample_input")
async def create_sample_input(
    project_uuid: str,
    sample_input: SampleInputBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check if same name in project
        sample_input_in_db = (
            await session.execute(
                select(SampleInput)
                .where(SampleInput.name == sample_input.name)
                .where(SampleInput.project_uuid == project_uuid)
            )
        ).scalar_one_or_none()

        if sample_input_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )

        new_sample_input = SampleInput(**sample_input.model_dump())
        session.add(new_sample_input)
        await session.commit()
        await session.refresh(new_sample_input)

        return new_sample_input.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# Tags Endpoints


@router.get("/project/{project_uuid}/tags")
async def fetch_tags(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        tags: List[Dict] = [
            tag.model_dump()
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
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class TagBody(BaseModel):
    name: str
    color: str


@router.post("/project/{project_uuid}/tag")
async def create_tag(
    project_uuid: str,
    tag: TagBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check if same name in project
        tag_in_db = (
            await session.execute(
                select(Tag)
                .where(Tag.name == tag.name)
                .where(Tag.project_uuid == project_uuid)
            )
        ).scalar_one_or_none()

        if tag_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )

        new_tag = Tag(**tag.model_dump())
        session.add(new_tag)
        await session.commit()
        await session.refresh(new_tag)

        return new_tag.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# FunctionSchema Endpoints


@router.get("/project/{project_uuid}/function_schemas")
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


@router.get("/function_schema/{uuid}")
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


# Changelog Endpoints


@router.get("/project/{project_uuid}/changelogs")
async def fetch_changelogs(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        changelogs: List[Dict] = [
            changelog.model_dump()
            for changelog in (
                await session.execute(
                    select(ProjectChangelog)
                    .where(ProjectChangelog.project_uuid == project_uuid)
                    .order_by(desc(ProjectChangelog.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return changelogs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# ChatModel Endpoints


@router.get("/project/{project_uuid}/chat_models")
async def fetch_chat_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_models: List[Dict] = [
            chat_model.model_dump()
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
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/project/{project_uuid}/chat_model")
async def create_chat_model(
    project_uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check same name
        chat_model_in_db = (
            await session.execute(
                select(ChatModel)
                .where(ChatModel.name == name)
                .where(ChatModel.project_uuid == project_uuid)
            )
        ).scalar_one_or_none()
        if chat_model_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )
        new_chat_model = ChatModel(name=name, project_uuid=project_uuid)
        session.add(new_chat_model)
        await session.commit()
        await session.refresh(new_chat_model)
        return new_chat_model.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/chat_model/{uuid}")
async def edit_chat_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(ChatModel).where(ChatModel.uuid == uuid).values(name=name)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/chat_model/{uuid}")
async def delete_chat_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(delete(ChatModel).where(ChatModel.uuid == uuid))
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# ChatModelVersion Endpoints


@router.get("/chat_model/{chat_model_uuid}/versions")
async def fetch_chat_model_versions(
    chat_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_model_versions: List[Dict] = [
            chat_model_version.model_dump()
            for chat_model_version in (
                await session.execute(
                    select(ChatModelVersion)
                    .where(ChatModelVersion.chat_model_uuid == chat_model_uuid)
                    .order_by(asc(ChatModelVersion.version))
                )
            )
            .scalars()
            .all()
        ]
        return chat_model_versions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/chat_model_version/{uuid}")
async def fetch_chat_model_version(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_model_version: Dict = (
            (
                await session.execute(
                    select(ChatModelVersion).where(ChatModelVersion.uuid == uuid)
                )
            )
            .scalar_one()
            .model_dump()
        )
        return chat_model_version
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class UpdatePublishedChatModelVersionBody(BaseModel):
    project_uuid: str
    project_version: int
    previous_published_version_uuid: Optional[str] = None


@router.post("/chat_model_version/{uuid}/publish")
async def update_published_chat_model_version(
    uuid: str,
    body: UpdatePublishedChatModelVersionBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        if body.previous_published_version_uuid:
            await session.execute(
                update(ChatModelVersion)
                .where(ChatModelVersion.uuid == body.previous_published_version_uuid)
                .values(published=False)
            )

        await session.execute(
            update(ChatModelVersion)
            .where(ChatModelVersion.uuid == uuid)
            .values(published=True)
        )
        await session.execute(
            update(Project)
            .where(Project.uuid == body.project_uuid)
            .values(version=body.project_version + 1)
        )

        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/chat_model_version/{uuid}/tags")
async def update_chat_model_version_tags(
    uuid: str,
    tags: List[str],
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(ChatModelVersion)
            .where(ChatModelVersion.uuid == uuid)
            .values(tags=tags)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/chat_model_version/{uuid}/memo")
async def update_chat_model_version_memo(
    uuid: str,
    memo: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(ChatModelVersion)
            .where(ChatModelVersion.uuid == uuid)
            .values(memo=memo)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# ChatLog Endpoints


@router.get("/chat_model_version/{chat_model_version_uuid}/sessions")
async def fetch_chat_log_sessions(
    chat_model_version_uuid: str,
    db_session: AsyncSession = Depends(get_session),
):
    try:
        chat_log_sessions: List[Dict] = [
            chat_log_session.model_dump()
            for chat_log_session in (
                await db_session.execute(
                    select(ChatLogSession)
                    .where(ChatLogSession.version_uuid == chat_model_version_uuid)
                    .order_by(desc(ChatLogSession.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return chat_log_sessions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/chat_session/{chat_session_uuid}/chat_logs")
async def fetch_session_chat_logs(
    chat_session_uuid: str,
    page: int,
    rows_per_page: int,
    db_session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs: List[Dict] = [
            chat_log.model_dump()
            for chat_log in (
                await db_session.execute(
                    select(ChatLogView)
                    .where(ChatLogView.session_uuid == chat_session_uuid)
                    .order_by(asc(ChatLogView.created_at))
                    .offset((page - 1) * rows_per_page)
                    .limit(rows_per_page)
                )
            )
            .scalars()
            .all()
        ]
        return chat_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project/{project_uuid}/chat_logs")
async def fetch_chat_logs(
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs: List[Dict] = [
            chat_log.model_dump()
            for chat_log in (
                await session.execute(
                    select(ChatLogView)
                    .where(ChatLogView.project_uuid == project_uuid)
                    .order_by(desc(ChatLogView.created_at))
                    .offset((page - 1) * rows_per_page)
                    .limit(rows_per_page)
                )
            )
            .scalars()
            .all()
        ]
        return chat_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project/{project_uuid}/chat_logs/count")
async def fetch_chat_logs_count(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        chat_logs_count: int = (
            (
                await session.execute(
                    select(ChatLogsCount).where(
                        ChatLogsCount.project_uuid == project_uuid
                    )
                )
            )
            .scalar_one()
            .model_dump()
        )

        return chat_logs_count
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# PromptModel Endpoints


@router.get("/project/{project_uuid}/prompt_models")
async def fetch_prompt_models(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_models: List[Dict] = [
            prompt_model.model_dump()
            for prompt_model in (
                await session.execute(
                    select(PromptModel)
                    .where(PromptModel.project_uuid == project_uuid)
                    .order_by(desc(PromptModel.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return prompt_models
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/project/{project_uuid}/prompt_model")
async def create_prompt_model(
    project_uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check same name
        prompt_model_in_db = (
            await session.execute(
                select(PromptModel)
                .where(PromptModel.name == name)
                .where(PromptModel.project_uuid == project_uuid)
            )
        ).scalar_one_or_none()
        if prompt_model_in_db:
            raise HTTPException(
                status_code=HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Same name in project",
            )
        new_prompt_model = PromptModel(name=name, project_uuid=project_uuid)
        session.add(new_prompt_model)
        await session.commit()
        await session.refresh(new_prompt_model)
        return new_prompt_model.model_dump()
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/prompt_model/{uuid}")
async def edit_prompt_model_name(
    uuid: str,
    name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(PromptModel).where(PromptModel.uuid == uuid).values(name=name)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/prompt_model/{uuid}")
async def delete_prompt_model(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(delete(PromptModel).where(PromptModel.uuid == uuid))
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# PromptModelVersion Endpoints


@router.get("/prompt_model/{prompt_model_uuid}/versions")
async def fetch_prompt_model_versions(
    prompt_model_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_model_versions: List[Dict] = [
            prompt_model_version.model_dump()
            for prompt_model_version in (
                await session.execute(
                    select(PromptModelVersion)
                    .where(PromptModelVersion.prompt_model_uuid == prompt_model_uuid)
                    .order_by(asc(PromptModelVersion.version))
                )
            )
            .scalars()
            .all()
        ]
        return prompt_model_versions
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/prompt_model_version/{uuid}")
async def fetch_prompt_model_version(
    uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompt_model_version: Dict = (
            (
                await session.execute(
                    select(PromptModelVersion).where(PromptModelVersion.uuid == uuid)
                )
            )
            .scalar_one()
            .model_dump()
        )
        return prompt_model_version
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


class UpdatePublishedPromptModelVersionBody(BaseModel):
    project_uuid: str
    project_version: int
    previous_published_version_uuid: Optional[str] = None


@router.post("/prompt_model_version/{uuid}/publish")
async def update_published_prompt_model_version(
    uuid: str,
    body: UpdatePublishedPromptModelVersionBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        if body.previous_published_version_uuid:
            await session.execute(
                update(PromptModelVersion)
                .where(PromptModelVersion.uuid == body.previous_published_version_uuid)
                .values(published=False)
            )

        await session.execute(
            update(PromptModelVersion)
            .where(PromptModelVersion.uuid == uuid)
            .values(published=True)
        )
        await session.execute(
            update(Project)
            .where(Project.uuid == body.project_uuid)
            .values(version=body.project_version + 1)
        )

        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/prompt_model_version/{uuid}/tags")
async def update_prompt_model_version_tags(
    uuid: str,
    tags: List[str],
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(PromptModelVersion)
            .where(PromptModelVersion.uuid == uuid)
            .values(tags=tags)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/prompt_model_version/{uuid}/memo")
async def update_prompt_model_version_memo(
    uuid: str,
    memo: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(PromptModelVersion)
            .where(PromptModelVersion.uuid == uuid)
            .values(memo=memo)
        )
        await session.commit()
        return Response(status_code=HTTP_200_OK)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# Prompt Endpoint


@router.get("/prompt_model_version/{prompt_model_version_uuid}/prompts")
async def fetch_prompts(
    prompt_model_version_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        prompts: List[Dict] = [
            prompt.model_dump()
            for prompt in (
                await session.execute(
                    select(Prompt)
                    .where(Prompt.version_uuid == prompt_model_version_uuid)
                    .order_by(asc(Prompt.step))
                )
            )
            .scalars()
            .all()
        ]
        return prompts
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# RunLog Endpoints


@router.get("/prompt_model_version/{prompt_model_version_uuid}/run_logs")
async def fetch_version_run_logs(
    prompt_model_version_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        run_logs: List[Dict] = [
            run_log.model_dump()
            for run_log in (
                await session.execute(
                    select(RunLog)
                    .where(RunLog.version_uuid == prompt_model_version_uuid)
                    .order_by(desc(RunLog.created_at))
                )
            )
            .scalars()
            .all()
        ]
        return run_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project/{project_uuid}/run_logs")
async def fetch_run_logs(
    project_uuid: str,
    page: int,
    rows_per_page: int,
    session: AsyncSession = Depends(get_session),
):
    try:
        run_logs: List[Dict] = [
            run_log.model_dump()
            for run_log in (
                await session.execute(
                    select(DeploymentRunLogView)
                    .where(DeploymentRunLogView.project_uuid == project_uuid)
                    .order_by(desc(DeploymentRunLogView.created_at))
                    .offset((page - 1) * rows_per_page)
                    .limit(rows_per_page)
                )
            )
            .scalars()
            .all()
        ]
        return run_logs
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/project/{project_uuid}/run_logs/count")
async def fetch_run_logs_count(
    project_uuid: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        run_logs_count: int = (
            (
                await session.execute(
                    select(RunLogsCount).where(
                        RunLogsCount.project_uuid == project_uuid
                    )
                )
            )
            .scalar_one()
            .model_dump()
        )

        return run_logs_count
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


# analytics Endpoints


@router.get("/prompt_model/{uuid}/metric")
async def fetch_daily_run_log_metrics(
    uuid: str,
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
                    .where(DailyRunLogMetric.prompt_model_uuid == uuid)
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


@router.get("/chat_model/{uuid}/metric")
async def fetch_daily_chat_log_metrics(
    uuid: str,
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
                    .where(DailyChatLogMetric.chat_model_uuid == uuid)
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
