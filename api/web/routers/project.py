"""APIs for Project Table"""
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


class CreateProjectBody(BaseModel):
    organization_id: str
    name: str
    description: Optional[str] = None


# Project Endpoints
@router.post("/")
async def create_project(
    body: CreateProjectBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        api_key = secrets.token_urlsafe(32)
        new_project = Project(
            name=body.name,
            organization_id=body.organization_id,
            description=body.description,
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


@router.get("/")
async def fetch_projects(
    organization_id: str,
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


@router.get("/{uuid}")
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
