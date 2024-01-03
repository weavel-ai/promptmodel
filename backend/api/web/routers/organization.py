"""APIs for Organization"""
import os

from datetime import datetime
from typing import Annotated, Dict
import httpx
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response, JSONResponse
from starlette.status import (
    HTTP_404_NOT_FOUND,
    HTTP_409_CONFLICT,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from utils.logger import logger

from base.database import get_session
from utils.security import get_jwt
from db_models import *
from ..models import (
    OrganizationInstance,
    CreateOrganizationBody,
    UpsertLLMProviderConfigBody,
)

router = APIRouter()


# Organization Endpoints
@router.post("", response_model=OrganizationInstance)
async def create_organization(
    jwt: Annotated[str, Depends(get_jwt)],
    body: CreateOrganizationBody,
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

        return OrganizationInstance(**new_org.model_dump())
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.patch("/{organization_id}", response_model=OrganizationInstance)
async def update_organization(
    jwt: Annotated[str, Depends(get_jwt)],
    organization_id: str,
    name: str,
    slug: str,
    session: AsyncSession = Depends(get_session),
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
    jwt: Annotated[str, Depends(get_jwt)],
    organization_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        user_id = jwt["user_id"]
        self_host = os.getenv("NEXT_PUBLIC_SELF_HOSTED") == "true"

        if not self_host:
            user_org = (
                await session.execute(
                    select(UsersOrganizations)
                    .where(UsersOrganizations.user_id == user_id)
                    .where(UsersOrganizations.organization_id == organization_id)
                )
            ).scalar_one_or_none()

            if not user_org:
                async with httpx.AsyncClient() as client:
                    res = await client.get(
                        url=f"https://api.clerk.com/v1/users/{user_id}/organization_memberships?limit=100&offset=0",
                        headers={
                            "Authorization": f"Bearer {os.getenv('CLERK_SECRET_KEY')}"
                        },
                    )
                    if res.status_code != 200:
                        raise HTTPException(
                            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Clerk Internal Server Error",
                        )
                    res = res.json()
                organization_id_list = [r["organization"]["id"] for r in res["data"]]

                if organization_id in organization_id_list:
                    session.add(
                        UsersOrganizations(
                            user_id=user_id, organization_id=organization_id
                        )
                    )
                    await session.commit()

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
            raise HTTPException(
                status_code=HTTP_409_CONFLICT,
                detail="API KEY already exists",
            )
        return OrganizationInstance(**org)
    except HTTPException as http_exc:
        logger.error(http_exc.detail)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.get("/{organization_id}/llm_providers")
async def get_org_configured_llm_providers(
    jwt: Annotated[str, Depends(get_jwt)],
    organization_id: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        # get list of llm_name
        configured_providers: List[str] = (
            (
                await session.execute(
                    select(OrganizationLLMProviderConfig.provider_name).where(
                        OrganizationLLMProviderConfig.organization_id == organization_id
                    )
                )
            )
            .scalars()
            .all()
        )

        return JSONResponse(content=configured_providers, status_code=200)

    except HTTPException as http_exc:
        logger.error(http_exc.detail)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.post("/{organization_id}/llm_providers")
async def save_organization_llm_provider_config(
    jwt: Annotated[str, Depends(get_jwt)],
    organization_id: str,
    body: UpsertLLMProviderConfigBody,
    session: AsyncSession = Depends(get_session),
):
    try:
        # Upsert OrganizationLLMProviderConfig
        # Check if provider_name already exists
        provider_config: Optional[OrganizationLLMProviderConfig] = (
            await session.execute(
                select(OrganizationLLMProviderConfig)
                .where(OrganizationLLMProviderConfig.organization_id == organization_id)
                .where(
                    OrganizationLLMProviderConfig.provider_name == body.provider_name
                )
            )
        ).scalar_one_or_none()
        if provider_config is None:
            # create new config
            new_provider_config = OrganizationLLMProviderConfig(
                organization_id=organization_id,
                provider_name=body.provider_name,
                env_vars=body.env_vars,
                params=body.params,
            )
            session.add(new_provider_config)
        else:
            # update existing config
            provider_config.env_vars = body.env_vars
            provider_config.params = body.params
            session.add(provider_config)

        await session.commit()

        return Response(status_code=200)

    except HTTPException as http_exc:
        logger.error(http_exc.detail)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )


@router.delete("/{organization_id}/llm_providers")
async def delete_organization_llm_api_key(
    jwt: Annotated[str, Depends(get_jwt)],
    organization_id: str,
    provider_name: str,
    session: AsyncSession = Depends(get_session),
):
    try:
        # check if configuration exists
        config = (
            await session.execute(
                select(OrganizationLLMProviderConfig)
                .where(OrganizationLLMProviderConfig.organization_id == organization_id)
                .where(OrganizationLLMProviderConfig.provider_name == provider_name)
            )
        ).scalar_one_or_none()

        if config is None:
            raise HTTPException(
                status_code=HTTP_404_NOT_FOUND,
                detail=f"Configuration for provider {provider_name} not exist",
            )

        await session.delete(config)
        await session.commit()

        return Response(status_code=200)

    except HTTPException as http_exc:
        logger.error(http_exc.detail)
        raise http_exc
    except Exception as e:
        logger.error(e)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal Server Error"
        )
