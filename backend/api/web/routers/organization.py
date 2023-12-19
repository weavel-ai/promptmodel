"""APIs for Organization"""
from datetime import datetime
from typing import Dict
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from fastapi import APIRouter, HTTPException, Depends
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.logger import logger

from base.database import get_session
from utils.security import get_user_id
from db_models import *
from ..models import OrganizationInstance, CreateOrganizationBody

router = APIRouter()


# Organization Endpoints
@router.post("", response_model=OrganizationInstance)
async def create_organization(
    body: CreateOrganizationBody,
    # jwt: Annotated[dict, Depends(JWT)],
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(get_user_id),
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

        return OrganizationInstance(**new_org.model_dump())
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{organization_id}", response_model=OrganizationInstance)
async def update_organization(
    organization_id: str,
    name: str,
    slug: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(get_user_id),
):
    try:
        updated_org = (
            (
                await session.execute(
                    update(Organization)
                    .where(Organization.organization_id == organization_id)
                    .values(name=name, slug=slug)
                    .returning(Organization)
                )
            )
            .scalar_one()
            .model_dump()
        )
        await session.commit()
        return OrganizationInstance(**updated_org)
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{organization_id}", response_model=OrganizationInstance)
async def get_organization(
    organization_id: str,
    session: AsyncSession = Depends(get_session),
    jwt: dict = Depends(get_user_id),
):
    try:
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
        except Exception as e:
            logger.error(e)
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail="Organization Not Found",
            )
        return OrganizationInstance(**org)
    except HTTPException as http_exc:
        logger.error(http_exc)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
