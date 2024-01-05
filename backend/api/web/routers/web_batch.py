"""APIs for promptmodel webpage"""
import re
import json
import os
import asyncio
from datetime import datetime, timezone
from typing import Annotated, Any, AsyncGenerator, Dict, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, desc, update

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import Response
from fastapi.responses import StreamingResponse
from starlette import status as status_code
from litellm import get_llm_provider, Router, ModelResponse, completion_cost

from promptmodel.llms.llm_dev import LLMDev
from promptmodel.types.response import LLMStreamResponse

from utils.logger import logger
from utils.prompt_utils import update_dict

from base.database import get_session, get_session_context
from utils.security import get_jwt
from api.common.models import FunctionModelBatchRunConfig
from api.web.models import LLMProviderArgs
from api.web.models.function_model_version import FunctionModelVersionBatchRunInstance
from db_models import *

router = APIRouter()


async def function_model_batch_run_background_task(
    batch_run_config: FunctionModelBatchRunConfig, batch_run_uuid: str, router_config: Dict[str, Any]
):
    try:
        async with get_session_context() as session:
            dataset_to_run: Dataset = (
                await session.execute(
                    select(Dataset).where(Dataset.uuid == batch_run_config.dataset_uuid)
                )
            ).scalar_one()

            function_model_version_to_run: FunctionModelVersion = (
                await session.execute(
                    select(FunctionModelVersion).where(
                        FunctionModelVersion.uuid
                        == batch_run_config.function_model_version_uuid
                    )
                )
            ).scalar_one()

            prompts: List[Prompt] = (
                (
                    await session.execute(
                        select(Prompt)
                        .where(
                            Prompt.version_uuid
                            == batch_run_config.function_model_version_uuid
                        )
                        .order_by(asc(Prompt.step))
                    )
                )
                .scalars()
                .all()
            )

            prompts = [p.model_dump() for p in prompts]

            sample_inputs_to_run: List[SampleInput] = (
                (
                    await session.execute(
                        select(SampleInput)
                        .join(
                            DatasetSampleInput,
                            DatasetSampleInput.sample_input_uuid == SampleInput.uuid,
                        )
                        .where(
                            DatasetSampleInput.dataset_uuid == batch_run_config.dataset_uuid
                        )
                    )
                )
                .scalars()
                .all()
            )

            litellm_router = Router(**router_config, num_retries=5, allowed_fails=2)

            async def __async_task__(
                model: str,
                sample_input_row: SampleInput,
                prompts: List[Dict[str, Any]],
                router: Router,
            ) -> RunLog:
                messages = [
                    {
                        "content": prompt["content"].format(**sample_input_row.content),
                        "role": prompt["role"],
                    }
                    for prompt in prompts
                ]

                res: ModelResponse = await router.acompletion(
                    model=model, messages=messages
                )
                
                print(f"SampleInput {sample_input_row.id} completed")

                return sample_input_row, res

            # run all sample inputs cuncurrently in asyncronous way
            tasks = [
                __async_task__(
                    model=function_model_version_to_run.model,
                    sample_input_row=sample_input,
                    prompts=prompts,
                    router=litellm_router,
                )
                for sample_input in sample_inputs_to_run
            ]

            results: List[Tuple(SampleInput, ModelResponse)] = await asyncio.gather(*tasks)

            # make RunLogs & RunLogScore
            
            # TODO: make this to select metric
            gt_exact_match_metric: EvalMetric = (
                await session.execute(
                    select(EvalMetric)
                    .where(EvalMetric.project_uuid == batch_run_config.project_uuid)
                    .where(EvalMetric.name == "gt_exact_match")
                )
            ).scalar_one()
            
            score = 0
            for result in results:
                success = 0
                sample_input_row, res = result
                sample_input_row: SampleInput = sample_input_row
                res: ModelResponse = res
                
                gt = sample_input_row.ground_truth
                prediction = res.choices[0].message.content
                # print(prediction)
                if not type(prediction) == str:
                    prediction = str(prediction)
                if gt == prediction:
                    score += 1
                    success = 1
                
                run_log = RunLog(
                    run_from_deployment=False,
                    inputs=sample_input_row.content,
                    raw_output=res.choices[0].message.content,
                    version_uuid=batch_run_config.function_model_version_uuid,
                    prompt_tokens=res.usage["prompt_tokens"],
                    completion_tokens=res.usage["completion_tokens"],
                    total_tokens=res.usage["total_tokens"],
                    latency=getattr(res, "_response_ms", None),
                    cost=completion_cost(res),
                    project_uuid=batch_run_config.project_uuid,
                    batch_run_uuid=batch_run_uuid,
                    sample_input_uuid=sample_input_row.uuid,
                )
                session.add(run_log)
                await session.commit()
                await session.refresh(run_log)
                
                run_log_score = RunLogScore(
                    run_log_uuid=run_log.uuid,
                    eval_metric_uuid=gt_exact_match_metric.uuid,
                    value=success
                )
                session.add(run_log_score)
                await session.commit()
            
            # save run_log and score
            
            score = score / len(results)
            
            # update BatchRun status = "completed"
            (
                await session.execute(
                    update(BatchRun)
                    .where(
                        BatchRun.function_model_version_uuid
                        == function_model_version_to_run.uuid
                    )
                    .where(BatchRun.dataset_uuid == dataset_to_run.uuid)
                    .values(status="completed", score=score, finished_at=datetime.now())
                )
            )
            await session.commit()
            return
    except Exception as e:
        logger.error(e)
        # set BatchRun status = "failed"
        async with get_session_context() as session:
            (
                await session.execute(
                    update(BatchRun)
                    .where(
                        BatchRun.function_model_version_uuid
                        == function_model_version_to_run.uuid
                    )
                    .where(BatchRun.dataset_uuid == dataset_to_run.uuid)
                    .values(status="failed", finished_at=datetime.now())
                )
            )
            await session.commit()
        raise e


@router.post("/run_function_model/batch")
async def batch_run_function_model(
    jwt: Annotated[str, Depends(get_jwt)],
    batch_run_config: FunctionModelBatchRunConfig,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    """Batch Run FunctionModel for cloud development environment."""
    user_auth_check = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == batch_run_config.project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="User don't have access to this project",
        )

    batch_run_exist_check = (
        await session.execute(
            select(BatchRun)
            .where(BatchRun.dataset_uuid == batch_run_config.dataset_uuid)
            .where(
                BatchRun.function_model_version_uuid
                == batch_run_config.function_model_version_uuid
            )
        )
    ).scalar_one_or_none()

    if batch_run_exist_check:
        raise HTTPException(
            status_code=status_code.HTTP_409_CONFLICT,
            detail="Batch run already exist",
        )

    # make router config
    function_model_version_to_run: FunctionModelVersion = (
        await session.execute(
            select(FunctionModelVersion).where(
                FunctionModelVersion.uuid
                == batch_run_config.function_model_version_uuid
            )
        )
    ).scalar_one()

    model, llm_provider, dynamic_api_key, api_base = get_llm_provider(
        model=function_model_version_to_run.model
    )  # get llm_provider

    if llm_provider in [
        "huggingface",
        "custom_openai",
        "oobabooga",
        "openrouter",
        "vertex_ai",
    ]:  # not supported yet
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="This LLM Provider is not supported yet",
        )
    
    organization_id = (
        await session.execute(
            select(Project.organization_id).where(Project.uuid == batch_run_config.project_uuid)
        )
    ).scalar_one()
    

    organization_provider_config: OrganizationLLMProviderConfig = (
        await session.execute(
            select(OrganizationLLMProviderConfig)
            .where(
                OrganizationLLMProviderConfig.organization_id == organization_id
            )
            .where(OrganizationLLMProviderConfig.provider_name == llm_provider)
        )
    ).scalar_one_or_none()

    if not organization_provider_config:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail=f"Organization doesn't have API keys set for {llm_provider}. Please set API keys in project settings.",
        )
        
    provider_args = LLMProviderArgs()
    # get value for key that includes "API_KEY"
    for key, val in organization_provider_config.env_vars.items():
        if "api_key" in key.lower():
            provider_args.api_key = val
        elif "api_base" in key.lower():
            provider_args.api_base = val
        elif "api_version" in key.lower():
            provider_args.api_version = val
    
    # TODO: use params later
    # provider_env_var = dict(organization_provider_config.env_vars)
    # api_key_key = list(filter(lambda x: "API_KEY" in x, provider_env_var.keys()))[0]
    # api_base_key = list(filter(lambda x: "API_BASE" in x, provider_env_var.keys()))
    # if len(api_base_key) > 0:
    #     api_base_key = api_base_key[0]
    # else:
    #     api_base_key = None
    # api_version_key = list(
    #     filter(lambda x: "API_VERSION" in x, provider_env_var.keys())
    # )
    # if len(api_version_key) > 0:
    #     api_version_key = api_version_key[0]
    # else:
    #     api_version_key = None

    # llm_api_key = provider_env_var[api_key_key]
    # llm_api_base = provider_env_var[api_base_key] if api_base_key else None
    # llm_api_version = provider_env_var[api_version_key] if api_version_key else None

    # provider_params = dict(organization_provider_config.params)

    # if "api_base" in provider_params:
    #     llm_api_base = provider_params["api_base"]
    #     del provider_params["api_base"]
    # if "api_version" in provider_params:
    #     llm_api_version = provider_params["api_version"]
    #     del provider_params["api_version"]

    litellm_router_config = {
        "model_list": [
            {
                "model_name": function_model_version_to_run.model,
                "litellm_params": {
                    "model": function_model_version_to_run.model,
                    "api_key": provider_args.api_key,
                    "api_base": provider_args.api_base,
                    "api_version": provider_args.api_version,
                },
            }
        ]
    }

    # litellm_router_config["model_list"][0]["litellm_params"].update(provider_params)

    # create BatchRun
    batch_run = BatchRun(
        dataset_uuid=batch_run_config.dataset_uuid,
        function_model_version_uuid=batch_run_config.function_model_version_uuid,
        status="running",
    )
    session.add(batch_run)
    await session.commit()
    await session.refresh(batch_run)

    # create backgroundTask
    background_tasks.add_task(
        function_model_batch_run_background_task,
        batch_run_config,
        str(batch_run.uuid) if type(batch_run.uuid) != str else batch_run.uuid,
        litellm_router_config,
    )

    return Response(status_code=200)

