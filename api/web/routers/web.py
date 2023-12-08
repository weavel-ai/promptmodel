"""APIs for promptmodel webpage"""
import re
import json
import secrets
from datetime import datetime, timezone
from operator import eq
from typing import Any, AsyncGenerator, Dict, List, Optional, Sequence, Tuple, Union
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
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
from .web_db import router as web_db_router

router = APIRouter()
router.include_router(web_db_router)


class ProjectInstance(BaseModel):
    name: str
    organization_id: str


# @router.post("/project")
# async def create_project(
#     project: ProjectInstance, session: AsyncSession = Depends(get_session)
# ):
#     """Generate a safe API key and create new project."""
#     api_key = secrets.token_urlsafe(32)  # generate a random URL-safe key
#     try:
#         new_project = Project(
#             name=project.name, organization_id=project.organization_id, api_key=api_key
#         )
#         session.add(new_project)
#         await session.commit()
#         await session.refresh(new_project)

#         return new_project.model_dump()

#     except Exception as exc:
#         logger.error(exc)
#         raise HTTPException(
#             status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=exc
#         ) from exc


@router.post("/run_prompt_model")
async def run_prompt_model(
    project_uuid: str,
    run_config: PromptModelRunConfig,
    session: AsyncSession = Depends(get_session),
):
    """Run PromptModel for cloud development environment.

    Args:
        run_config (PromptModelRunConfig):
            prompt_model_uuid: str
            prompts: List of prompts (type, step, content)
            model: str
            from_version: previous version number (Optional)
            version_uuid: current version uuid (Optional if from_version is provided)
            sample_name: Sample name (Optional)
            parsing_type: ParsingType (colon, square_bracket, double_square_bracket, html)
            output_keys: List of output keys (Optional)
            functions: List of function schemas (Optional)
    Output:
        StreamingResponse
            raw_output: str
            parsed_outputs: Dict
            status: "completed" | "failed" | "running"
    """

    async def stream_run():
        async for chunk in run_cloud_prompt_model(
            session=session, project_uuid=project_uuid, run_config=run_config
        ):
            yield json.dumps(chunk)

    try:
        return StreamingResponse(
            stream_run(),
        )
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=exc
        ) from exc


async def run_cloud_prompt_model(
    session: AsyncSession, project_uuid: str, run_config: PromptModelRunConfig
):
    """Run PromptModel on the cloud, request from web."""
    sample_input: Dict[str, Any] = {}
    # get sample from db

    if run_config.sample_name:
        sample_input = (
            await session.execute(
                select(SampleInput.content).where(
                    (SampleInput.project_uuid == project_uuid)
                    & (SampleInput.name == run_config.sample_name)
                )
            )
        ).scalar_one()

    # Validate Variable Matching
    prompt_variables = []
    for prompt in run_config.prompts:
        prompt_content = prompt.content
        # Replace
        escaped_patterns = re.findall(r"\{\{.*?\}\}", prompt_content)
        for i, pattern in enumerate(escaped_patterns):
            prompt_content = prompt_content.replace(pattern, f"__ESCAPED{i}__")

        # find f-string input variables
        fstring_input_pattern = r"(?<!\\)\{([^}]+)\}(?<!\\})"
        prompt_variables_in_prompt = re.findall(fstring_input_pattern, prompt_content)

        # Replace back
        for i, pattern in enumerate(escaped_patterns):
            prompt_content = prompt_content.replace(f"__ESCAPED{i}__", pattern)

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
    # Start PromptModel Running
    output = {"raw_output": "", "parsed_outputs": {}}
    function_call = None
    try:
        # create prompt_model_dev_instance
        prompt_model_dev = LLMDev()
        # find prompt_model_uuid from local db
        prompt_model_version_uuid: Optional[str] = run_config.version_uuid
        # If prompt_model_version_uuid is None, create new version & prompt
        changelogs = []
        need_project_version_update = False

        if prompt_model_version_uuid is None:
            if run_config.from_version is None:
                version = 1
                need_project_version_update = True
            else:
                latest_version = (
                    await session.execute(
                        select(PromptModelVersion.version)
                        .where(
                            PromptModelVersion.prompt_model_uuid
                            == run_config.prompt_model_uuid
                        )
                        .order_by(desc(PromptModelVersion.version))
                        .limit(1)
                    )
                ).scalar_one()

                version = latest_version + 1
            new_prompt_model_version_row = PromptModelVersion(
                **{
                    "prompt_model_uuid": run_config.prompt_model_uuid,
                    "from_version": run_config.from_version,
                    "version": version,
                    "model": run_config.model,
                    "parsing_type": run_config.parsing_type,
                    "output_keys": run_config.output_keys,
                    "functions": run_config.functions,
                    "is_published": True if version == 1 else False,
                }
            )
            session.add(new_prompt_model_version_row)
            await session.commit()
            await session.refresh(new_prompt_model_version_row)

            changelogs.append(
                {
                    "subject": "prompt_model_version",
                    "identifier": [str(new_prompt_model_version_row.uuid)],
                    "action": "ADD",
                }
            )

            if need_project_version_update:
                changelogs.append(
                    {
                        "subject": "prompt_model_version",
                        "identifier": [str(new_prompt_model_version_row.uuid)],
                        "action": "PUBLISH",
                    }
                )

            prompt_model_version_uuid: str = str(new_prompt_model_version_row.uuid)
            for prompt in run_config.prompts:
                prompt_row = Prompt(
                    **{
                        "version_uuid": prompt_model_version_uuid,
                        "role": prompt.role,
                        "step": prompt.step,
                        "content": prompt.content,
                    }
                )
                prompt_row = session.merge(prompt_row)
                session.add(prompt_row)
                await session.commit()

            data = {
                "prompt_model_version_uuid": prompt_model_version_uuid,
                "version": version,
                "status": "running",
            }
            yield data

        data = {
            "status": "running",
            "inputs": sample_input if sample_input else {},
        }
        yield data

        model = run_config.model
        prompts = run_config.prompts
        parsing_type = run_config.parsing_type

        if sample_input:
            messages = [
                {
                    "content": prompt.content.format(**sample_input),
                    "role": prompt.role,
                }
                for prompt in prompts
            ]
        else:
            messages = [prompt.model_dump() for prompt in prompts]

        parsing_success = True
        error_log = None

        # NOTE : Function call is not supported yet in cloud development environment

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

        res: AsyncGenerator[LLMStreamResponse, None] = prompt_model_dev.dev_run(
            messages=messages,
            parsing_type=parsing_type,
            functions=function_schemas,
            model=model,
        )
        async for item in res:
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

            if item.error and parsing_success is True:
                parsing_success = not item.error
                error_log = item.error_log

            yield data

        if (
            function_call is not None
            and run_config.output_keys is not None
            and run_config.parsing_type is not None
            and set(output["parsed_outputs"].keys()) != set(run_config.output_keys)
            or (parsing_success is False)
        ):
            error_log = error_log if error_log else "Key matching failed."
            data = {"status": "failed", "log": f"parsing failed, {error_log}"}

            # Create run log
            run_log_row = RunLog(
                **{
                    "version_uuid": prompt_model_version_uuid,
                    "inputs": sample_input,
                    "raw_output": output["raw_output"],
                    "parsed_outputs": output["parsed_outputs"],
                    "run_log_metadata": {
                        "error_log": error_log,
                        "error": True,
                    },
                    "score": 0,
                    "run_from_deployment": False,
                }
            )
            session.add(run_log_row)
            await session.commit()

            yield data

            if len(changelogs) > 0:
                session.add(
                    ProjectChangelog(
                        **{
                            "logs": changelogs,
                            "project_uuid": project_uuid,
                        }
                    )
                )
                await session.commit()

            if need_project_version_update:
                project_version = (
                    await session.execute(
                        select(Project.version).where(Project.uuid == project_uuid)
                    )
                ).scalar_one()

                await session.execute(
                    update(Project)
                    .where(Project.uuid == project_uuid)
                    .values(version=project_version + 1)
                )
                await session.commit()
            return

        # Create run log
        session.add(
            RunLog(
                **{
                    "version_uuid": prompt_model_version_uuid,
                    "inputs": sample_input,
                    "raw_output": output["raw_output"],
                    "parsed_outputs": output["parsed_outputs"],
                    "function_call": function_call,
                    "run_from_deployment": False,
                }
            )
        )
        await session.commit()

        data = {
            "status": "completed",
        }

        if len(changelogs) > 0:
            session.add(
                ProjectChangelog(
                    **{
                        "logs": changelogs,
                        "project_uuid": project_uuid,
                    }
                )
            )
            await session.commit()

        if need_project_version_update:
            project_version = (
                await session.execute(
                    select(Project.version).where(Project.uuid == project_uuid)
                )
            ).scalar_one()

            await session.execute(
                update(Project)
                .where(Project.uuid == project_uuid)
                .values(version=project_version + 1)
            )
            await session.commit()

        yield data
    except Exception as error:
        logger.error(f"Error running service: {error}")
        data = {
            "status": "failed",
            "log": str(error),
        }
        yield data
        return


@router.post("/run_chat_model")
async def run_chat_model(
    project_uuid: str,
    chat_config: ChatModelRunConfig,
    session: AsyncSession = Depends(get_session),
):
    """Run ChatModel from web.

    Args:
        chat_config (ChatModelRunConfig):
            chat_model_uuid: (str)
            system_prompt: str
            user_input: str
            model: str
            from_version: previous version number (Optional)
            session_uuid: current session uuid (Optional)
            version_uuid: current version uuid (Optional if from_version is provided)
            functions: List of functions (Optional)

    Raises:
        HTTPException: 500

    Returns:
        StreamingResponse
            raw_output: str
            status: "completed" | "failed" | "running"
    """

    async def stream_run():
        async for chunk in run_cloud_chat_model(
            session=session, project_uuid=project_uuid, chat_config=chat_config
        ):
            yield json.dumps(chunk)

    try:
        return StreamingResponse(
            stream_run(),
        )
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=exc
        ) from exc


async def run_cloud_chat_model(
    session: AsyncSession,
    project_uuid: str,
    chat_config: ChatModelRunConfig,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Run ChatModel from cloud deployment environment.

    Args:
        chat_config (ChatModelRunConfig):
            chat_model_uuid: (str)
            system_prompt: str
            user_input: str
            model: str
            from_version: previous version number (Optional)
            session_uuid: current session uuid (Optional)
            version_uuid: current version uuid (Optional if from_version is provided)
            functions: List of functions (Optional)

    Returns:
        AsyncGenerator: Dict[str, Any]
            status: "completed" | "failed" | "running"
            chat_log_session_uuid: Optional[str]
            log: Optional[str]

    """
    try:
        start_timestampz_iso = datetime.now(timezone.utc)
        chat_model_dev = LLMDev()
        chat_model_version_uuid: Union[str, None] = chat_config.version_uuid
        session_uuid: Union[str, None] = chat_config.session_uuid
        messages = [{"role": "system", "content": chat_config.system_prompt}]
        need_project_version_update = False
        changelogs = []

        # If chat_model_version_uuid is None, create new version
        if chat_model_version_uuid is None:
            version: int
            if chat_config.from_version is None:
                version = 1
                need_project_version_update = True
            else:
                latest_version = (
                    await session.execute(
                        select(ChatModelVersion.version)
                        .where(
                            ChatModelVersion.chat_model_uuid
                            == chat_config.chat_model_uuid
                        )
                        .order_by(desc(ChatModelVersion.version))
                        .limit(1)
                    )
                ).scalar_one()

                version = latest_version + 1

            new_chat_model_version_row = ChatModelVersion(
                **{
                    "chat_model_uuid": chat_config.chat_model_uuid,
                    "from_version": chat_config.from_version,
                    "version": version,
                    "model": chat_config.model,
                    "system_prompt": chat_config.system_prompt,
                    "functions": chat_config.functions,
                    "is_published": True if version == 1 else False,
                }
            )
            session.add(new_chat_model_version_row)
            await session.commit()
            await session.refresh(new_chat_model_version_row)

            changelogs.append(
                {
                    "subject": "chat_model_version",
                    "identifier": [str(new_chat_model_version_row.uuid)],
                    "action": "ADD",
                }
            )
            if need_project_version_update:
                changelogs.append(
                    {
                        "subject": "chat_model_version",
                        "identifier": [str(new_chat_model_version_row.uuid)],
                        "action": "PUBLISH",
                    }
                )

            chat_model_version_uuid: str = str(new_chat_model_version_row.uuid)

            data = {
                "chat_model_version_uuid": chat_model_version_uuid,
                "version": version,
                "status": "running",
            }
            yield data

        # If session uuid is None, create new session
        if session_uuid is None:
            new_session = ChatLogSession(
                **{
                    "version_uuid": chat_model_version_uuid,
                    "run_from_deployment": False,
                }
            )
            session.add(new_session)
            await session.commit()
            await session.refresh(new_session)

            session_uuid: str = str(new_session.uuid)

            data = {
                "chat_log_session_uuid": session_uuid,
                "status": "running",
            }
            yield data
        else:
            # If session exists, fetch session chat logs from cloud db
            session_chat_logs = (
                (
                    await session.execute(
                        select(
                            ChatLog.role,
                            ChatLog.name,
                            ChatLog.content,
                            ChatLog.tool_calls,
                        )
                        .where(ChatLog.session_uuid == session_uuid)
                        .order_by(asc(ChatLog.created_at))
                    )
                )
                .mappings()
                .all()
            )
            messages += session_chat_logs
            messages = [
                {k: v for k, v in message.items() if v is not None}
                for message in messages
            ]

        # Append user input to messages
        messages.append({"role": "user", "content": chat_config.user_input})
        # Stream chat
        res: AsyncGenerator[LLMStreamResponse, None] = chat_model_dev.dev_chat(
            messages=messages,
            model=chat_config.model,
            # functions=function_schemas,
        )

        # TODO: Add function call support
        raw_output = ""
        function_call = None
        async for item in res:
            if item.raw_output is not None:
                raw_output += item.raw_output
                data = {
                    "status": "running",
                    "raw_output": item.raw_output,
                }

            if item.function_call is not None:
                if function_call is None:
                    function_call = {}
                data = {
                    "status": "running",
                    "function_call": item.function_call.model_dump(),
                }
                function_call = update_dict(
                    function_call, item.function_call.model_dump()
                )

            if item.error:
                error_log = item.error_log

            yield data

        # Create chat log
        session.add(
            ChatLog(
                **{
                    "created_at": start_timestampz_iso,
                    "session_uuid": session_uuid,
                    "role": "user",
                    "content": chat_config.user_input,
                }
            )
        )
        session.add(
            ChatLog(
                **{
                    "session_uuid": session_uuid,
                    "role": "assistant",
                    "content": raw_output,
                    "tool_calls": [function_call],
                }
            )
        )
        await session.commit()

        data = {
            "status": "completed",
        }

        if len(changelogs) > 0:
            session.add(
                ProjectChangelog(
                    **{
                        "logs": changelogs,
                        "project_uuid": project_uuid,
                    }
                )
            )
            await session.commit()
        if need_project_version_update:
            project_version = (
                await session.execute(
                    select(Project.version).where(Project.uuid == project_uuid)
                )
            ).scalar_one()

            await session.execute(
                update(Project)
                .where(Project.uuid == project_uuid)
                .values(version=project_version + 1)
            )
            await session.commit()

        yield data

    except Exception as exc:
        logger.error(f"Error running service: {exc}")
        data = {
            "status": "failed",
            "log": str(exc),
        }
        yield data
        return
