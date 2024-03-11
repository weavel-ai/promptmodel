"""APIs for promptmodel webpage"""
import json
from typing import Annotated
from modules.executors.function_model import run_cloud_function_model
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from starlette import status as status_code
import litellm
from api.web.models import LLMProviderArgs

from base.database import get_session
from utils.security import get_jwt
from api.common.models import FunctionModelRunConfig, ChatModelRunConfig
from db_models import *
from .web_batch import router as batch_router

router = APIRouter()

router.include_router(batch_router)


@router.post("/run_function_model")
async def run_function_model(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    run_config: FunctionModelRunConfig,
    session: AsyncSession = Depends(get_session),
):
    """Run FunctionModel for cloud development environment."""
    user_auth_check: Project = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        provider_args = LLMProviderArgs()
    else:
        provider_args = LLMProviderArgs()
        llm_provider = litellm.get_llm_provider(run_config.model)[1]
        provider_config = (
            await session.execute(
                select(OrganizationLLMProviderConfig)
                .where(
                    OrganizationLLMProviderConfig.organization_id
                    == user_auth_check.organization_id
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
    

    async def stream_run():
        async for chunk in run_cloud_function_model(
            session=session,
            project_uuid=project_uuid,
            run_config=run_config,
            provider_args=provider_args,
        ):
            logger.debug(chunk)
            yield json.dumps(chunk)
        session.close()

    return StreamingResponse(
        stream_run(),
    )


async def run_cloud_function_model(
    session: AsyncSession,
    project_uuid: str,
    run_config: FunctionModelRunConfig,
    provider_args: LLMProviderArgs,
):
    """Run FunctionModel on the cloud, request from web."""
    sample_input: Dict[str, str] = (
        run_config.sample_input if run_config.sample_input else {}
    )

    # Validate Variable Matching
    prompt_variables = []
    for prompt in run_config.prompts:
        prompt_content = prompt.content
        
        # find f-string input variables
        fstring_input_pattern = r"(?<!\\)\{\{([^}]+)\}\}(?<!\\})"
        prompt_variables_in_prompt = re.findall(fstring_input_pattern, prompt_content)

        prompt_variables_in_prompt = list(set(prompt_variables_in_prompt))
        prompt_variables += prompt_variables_in_prompt

    prompt_variables = list(set(prompt_variables))

    if len(prompt_variables) != 0:
        if sample_input is None:
            data = {
                "status": "failed",
                "log": f"Prompt has variables {prompt_variables}. Sample input is required for variable matching.",
            }
            yield data
            return
        if not all(variable in sample_input.keys() for variable in prompt_variables):
            missing_variables = [
                variable
                for variable in prompt_variables
                if variable not in sample_input.keys()
            ]
            data = {
                "status": "failed",
                "log": f"Sample input does not have variables {missing_variables} in prompts.",
            }
            yield data
            return
        
    # Start FunctionModel Running
    output = {"raw_output": "", "parsed_outputs": {}}
    model_res = litellm.ModelResponse(
        usage=litellm.Usage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
        model=run_config.model,
    )
    latency = 0
    function_call = None
    try:
        # create function_model_dev_instance
        function_model_dev = LLMDev()
        # find function_model_uuid from local db
        function_model_version_uuid: Optional[str] = run_config.version_uuid
        # If function_model_version_uuid is None, create new version & prompt

        data = {
            "sample_input_uuid": run_config.sample_input_uuid,
            "function_model_version_uuid": function_model_version_uuid,
            "status": "running",
            "inputs": sample_input if sample_input else {},
        }
        yield data

        model = run_config.model
        prompts = run_config.prompts
        parsing_type = run_config.parsing_type
        

        if sample_input:
            for prompt in prompts:
                prompt.content = prompt.content.replace("{", "{{").replace("}", "}}")
                prompt.content = prompt.content.replace("{{{{", "{").replace("}}}}", "}")
            messages = [
                {
                    "content": prompt.content.format(**sample_input),
                    "role": prompt.role,
                }
                for prompt in prompts
            ]
        else:
            messages = [
                {
                    "content": prompt.content,
                    "role": prompt.role,
                }
                for prompt in prompts
            ]

        error_occurs = False
        error_log = None

        # NOTE : Function call is not supported yet in cloud development environment

        if run_config.functions is None:
            function_schemas = None
        else:
            # add function schemas
            function_schemas = (
                (
                    await session.execute(
                        select(
                            FunctionSchema.name,
                            FunctionSchema.description,
                            FunctionSchema.parameters,
                            FunctionSchema.mock_response,
                        )
                        .where(FunctionSchema.project_uuid == project_uuid)
                        .where(FunctionSchema.name.in_(run_config.functions))
                    )
                )
                .mappings()
                .all()
            )

        res: AsyncGenerator[LLMStreamResponse, None] = function_model_dev.dev_run(
            messages=messages,
            parsing_type=parsing_type,
            functions=function_schemas,
            model=model,
            **provider_args.model_dump(),
        )
        async for item in res:
            if (item.api_response is not None) and (
                item.api_response.choices[0].finish_reason is not None
            ):
                model_res = item.api_response
                model_res.model = model
                latency = (
                    item.api_response["response_ms"]
                    if "response_ms" in item.api_response
                    else None
                )
                latency = (
                    item.api_response["_response_ms"]
                    if "_response_ms" in item.api_response
                    else latency
                )
            if item.raw_output is not None:
                output["raw_output"] += item.raw_output
                data = {
                    "status": "running",
                    "raw_output": item.raw_output,
                }
            if item.parsed_outputs:
                if list(item.parsed_outputs.keys())[0] not in output["parsed_outputs"]:
                    output["parsed_outputs"][
                        list(item.parsed_outputs.keys())[0]
                    ] = list(item.parsed_outputs.values())[0]
                else:
                    output["parsed_outputs"][
                        list(item.parsed_outputs.keys())[0]
                    ] += list(item.parsed_outputs.values())[0]
                data = {
                    "status": "running",
                    "parsed_outputs": item.parsed_outputs,
                }

            if item.function_call is not None:
                data = {
                    "status": "running",
                    "function_call": item.function_call.model_dump(),
                }
                function_call = item.function_call.model_dump()

            if item.error and error_occurs is False:
                error_occurs = item.error
                error_log = item.error_log
                
            yield data

        if (
            function_call is None
            and run_config.output_keys is not None
            and run_config.parsing_type is not None
            and set(output["parsed_outputs"].keys()) != set(run_config.output_keys)
            or (error_occurs is True)
        ):
            error_log = error_log if error_log else "Key matching failed."
            data = {"status": "failed", "log": f"parsing failed, {error_log}"}
            yield data

        # Create run log
        if function_model_version_uuid is not None:
            session.add(
                RunLog(
                    **{
                        "project_uuid": project_uuid,
                        "version_uuid": function_model_version_uuid,
                        "inputs": sample_input,
                        "raw_output": output["raw_output"],
                        "parsed_outputs": output["parsed_outputs"],
                        "prompt_tokens": model_res.usage.get("prompt_tokens"),
                        "completion_tokens": model_res.usage.get("completion_tokens"),
                        "total_tokens": model_res.usage.get("total_tokens"),
                        "cost": litellm.completion_cost(model_res),
                        "latency": latency,
                        "function_call": function_call,
                        "run_log_metadata": {
                            "error_log": error_log,
                            "error": True,
                        }
                        if error_occurs
                        else None,
                        "run_from_deployment": False,
                        "sample_input_uuid": run_config.sample_input_uuid,
                    }
                )
            )
            await session.commit()

        data = {
            "status": "completed",
        }
        yield data

    except Exception as error:
        logger.error(f"Error running service: {error}")
        data = {
            "status": "failed",
            "log": str(error),
        }
        yield data
        raise error


@router.post("/run_chat_model")
async def run_chat_model(
    jwt: Annotated[str, Depends(get_jwt)],
    project_uuid: str,
    chat_config: ChatModelRunConfig,
    session: AsyncSession = Depends(get_session),
):
    """Run ChatModel from web."""
    user_auth_check: Project = (
        await session.execute(
            select(Project)
            .join(
                UsersOrganizations,
                Project.organization_id == UsersOrganizations.organization_id,
            )
            .where(Project.uuid == project_uuid)
            .where(UsersOrganizations.user_id == jwt["user_id"])
        )
    ).scalar_one_or_none()

    if not user_auth_check:
        raise HTTPException(
            status_code=status_code.HTTP_403_FORBIDDEN,
            detail="User don't have access to this project",
        )

    provider_args = LLMProviderArgs()
    llm_provider = litellm.get_llm_provider(chat_config.model)[1]
    provider_config = (
        await session.execute(
            select(OrganizationLLMProviderConfig)
            .where(
                OrganizationLLMProviderConfig.organization_id
                == user_auth_check.organization_id
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

    async def stream_run():
        async for chunk in run_cloud_chat_model(
            session=session,
            project_uuid=project_uuid,
            chat_config=chat_config,
            provider_args=provider_args,
        ):
            yield json.dumps(chunk)

    return StreamingResponse(
        stream_run(),
    )
