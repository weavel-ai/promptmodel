from typing import Annotated, Dict

import litellm
from fastapi import APIRouter, Depends, HTTPException
from starlette import status as status_code
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.common.models.models import FunctionModelRunConfig
from api.public.models.function_model import RunFunctionModelRequest
from api.web.models.organization import LLMProviderArgs
from base.database import get_session
from db_models.project import OrganizationLLMProviderConfig
from modules.executors.function_model import run_cloud_function_model
from utils.security import get_project

router = APIRouter()


@router.post("/run_function_model")
async def run_function_model(
    body: RunFunctionModelRequest,
    project: Dict = Depends(get_project),
    session: AsyncSession = Depends(get_session),
):
    project_uuid = project.get("uuid")

    # Fetch run config
    run_config: FunctionModelRunConfig = FunctionModelRunConfig(
        name=body.name, inputs=body.inputs, version=body.version, stream=body.stream
    )

    # Fetch provider config
    provider_args = LLMProviderArgs()
    llm_provider = litellm.get_llm_provider(run_config.model)[1]
    provider_config = (
        await session.execute(
            select(OrganizationLLMProviderConfig)
            .where(
                OrganizationLLMProviderConfig.organization_id
                == project.get("organization_id")
            )
            .where(OrganizationLLMProviderConfig.provider_name == llm_provider)
        )
    ).scalar_one_or_none()

    if not provider_config:
        raise HTTPException(
            status_code=status_code.HTTP_428_PRECONDITION_REQUIRED,
            detail=f"Organization doesn't have API keys set for {llm_provider}. Please set API keys in project settings.",
        )

    for key, val in provider_config.env_vars.items():
        if "api_key" in key.lower():
            provider_args.api_key = val
        elif "api_base" in key.lower():
            provider_args.api_base = val
        elif "api_version" in key.lower():
            provider_args.api_version = val

    # await run_cloud_function_model(project_uuid, body)

    return {"message": "Function Model"}
