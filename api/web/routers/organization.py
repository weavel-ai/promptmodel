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


class CreateOrganizationBody(BaseModel):
    organization_id: str
    name: str
    user_id: str
    slug: str


# Organization Endpoints
@router.post("/")
async def create_organization(
    body: CreateOrganizationBody,
    # jwt: Annotated[dict, Depends(JWT)],
    session: AsyncSession = Depends(get_session),
):
    try:
        new_org = Organization(
            organization_id=body.organization_id,
            name=body.name,
            slug=body.slug,
        )
        session.add(new_org)
        await session.flush()
        await session.refresh(new_org)

        session.add(
            UsersOrganizations(
                user_id=body.user_id, organization_id=new_org.organization_id
            )
        )
        await session.commit()
        await session.refresh(new_org)

        return new_org.model_dump()
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{organization_id}/")
async def update_organization(
    organization_id: str,
    name: str,
    slug: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        await session.execute(
            update(Organization)
            .where(Organization.organization_id == organization_id)
            .values(name=name, slug=slug)
        )
        org: Dict = (
            (
                await session.execute(
                    select(Organization).where(
                        Organization.organization_id == organization_id
                    )
                )
            )
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


@router.get("/{organization_id}")
async def get_organization(
    organization_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        org: Dict = (
            (
                await session.execute(
                    select(Organization).where(
                        Organization.organization_id == organization_id
                    )
                )
            )
            .scalar_one()
            .model_dump()
        )
        return org
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
