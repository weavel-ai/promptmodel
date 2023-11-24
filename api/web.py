"""APIs for promptmodel webpage"""
import re
import json
import secrets
from datetime import datetime, timezone
from operator import eq
from typing import Any, AsyncGenerator, Dict, List, Optional, Sequence, Tuple, Union
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_422_UNPROCESSABLE_ENTITY,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from promptmodel.llms.llm_dev import LLMDev
from promptmodel.types.response import LLMStreamResponse

from utils.logger import logger
from base.database import supabase
from api.dev import PromptModelRunConfig, ChatModelRunConfig

router = APIRouter()


class Project(BaseModel):
    name: str
    organization_id: str


@router.post("/project")
async def create_project(project: Project):
    """Generate a safe API key and create new project."""
    api_key = secrets.token_urlsafe(32)  # generate a random URL-safe key
    try:
        project_res = (
            supabase.table("project")
            .insert(
                {
                    "name": project.name,
                    "organization_id": project.organization_id,
                    "api_key": api_key,
                }
            )
            .execute()
            .data[0]
        )
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=exc
        ) from exc

    return JSONResponse(project_res, status_code=HTTP_200_OK)


@router.post("/run_prompt_model")
async def run_prompt_model(run_config: PromptModelRunConfig):
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
        async for chunk in run_cloud_llm(run_config=run_config):
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


async def run_cloud_llm(run_config: PromptModelRunConfig):
    """Run PromptModel on the cloud, request from web."""
    sample_input: Dict[str, Any] = {}
    # get sample from db
    if run_config.sample_name:
        sample_input = (
            supabase.table("sample_input")
            .select("content")
            .eq("name", run_config.sample_name)
            .single()
            .execute()
            .data["content"]
        )
    # Validate Variable Matching
    prompt_variables = []
    for prompt in run_config.prompts:
        fstring_input_pattern = r"(?<!\\)(?<!{{)\{([^}]+)\}(?!\\)(?!}})"
        prompt_variables += re.findall(fstring_input_pattern, prompt.content)
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
    try:
        # create prompt_model_dev_instance
        prompt_model_dev = LLMDev()
        # find prompt_model_uuid from local db
        prompt_model_version_uuid: Optional[str] = run_config.version_uuid
        # If prompt_model_version_uuid is None, create new version & prompt
        if prompt_model_version_uuid is None:
            version: int
            if run_config.from_version is None:
                version = 1
            else:
                latest_version = (
                    supabase.table("prompt_model_version")
                    .select("version")
                    .eq("prompt_model_uuid", run_config.prompt_model_uuid)
                    .order("version", desc=True)
                    .limit(1)
                    .single()
                    .execute()
                    .data["version"]
                )
                version = latest_version + 1
            prompt_model_version = (
                supabase.table("prompt_model_version")
                .insert(
                    {
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
                .execute()
                .data[0]
            )

            prompt_model_version_uuid: str = prompt_model_version["uuid"]

            for prompt in run_config.prompts:
                supabase.table("prompt").insert(
                    {
                        "version_uuid": prompt_model_version_uuid,
                        "role": prompt.role,
                        "step": prompt.step,
                        "content": prompt.content,
                    }
                ).execute()

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

        res: AsyncGenerator[LLMStreamResponse, None] = prompt_model_dev.dev_run(
            messages=messages,
            parsing_type=parsing_type,
            functions=run_config.functions,
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

            if item.error and parsing_success is True:
                parsing_success = not item.error
                error_log = item.error_log

            yield data

        if (
            run_config.output_keys is not None
            and run_config.parsing_type is not None
            and set(output["parsed_outputs"].keys()) != set(run_config.output_keys)
            or (parsing_success is False)
        ):
            error_log = error_log if error_log else "Key matching failed."
            data = {"status": "failed", "log": f"parsing failed, {error_log}"}

            # Create run log
            supabase.table("run_log").insert(
                {
                    "version_uuid": prompt_model_version_uuid,
                    "inputs": sample_input,
                    "raw_output": output["raw_output"],
                    "parsed_outputs": output["parsed_outputs"],
                    "metadata": {
                        "error_log": error_log,
                        "error": True,
                    },
                    "score": 0,
                    "run_from_deployment": False,
                }
            ).execute()

            yield data
            return

        data = {
            "status": "completed",
        }

        yield data

        # Create run log
        supabase.table("run_log").insert(
            {
                "version_uuid": prompt_model_version_uuid,
                "inputs": sample_input,
                "raw_output": output["raw_output"],
                "parsed_outputs": output["parsed_outputs"],
                "run_from_deployment": False,
            }
        ).execute()
    except Exception as error:
        logger.error(f"Error running service: {error}")
        data = {
            "status": "failed",
            "log": str(error),
        }
        yield data
        return


@router.post("/run_chat_model")
async def run_chat_model(chat_config: ChatModelRunConfig):
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
        async for chunk in run_cloud_chat(chat_config=chat_config):
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


async def run_cloud_chat(
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
        start_timestampz_iso = datetime.now(timezone.utc).isoformat()
        chat_model_dev = LLMDev()
        chat_model_version_uuid: Union[str, None] = chat_config.version_uuid
        session_uuid: Union[str, None] = chat_config.session_uuid
        messages = [{"role": "system", "content": chat_config.system_prompt}]

        # If chat_model_version_uuid is None, create new version
        if chat_model_version_uuid is None:
            version: int
            if chat_config.from_version is None:
                version = 1
            else:
                latest_version = (
                    supabase.table("chat_model_version")
                    .select("version")
                    .eq("chat_model_uuid", chat_config.chat_model_uuid)
                    .order("version", desc=True)
                    .limit(1)
                    .single()
                    .execute()
                    .data["version"]
                )
                version = latest_version + 1

            chat_model_version = (
                supabase.table("chat_model_version")
                .insert(
                    {
                        "chat_model_uuid": chat_config.chat_model_uuid,
                        "from_version": chat_config.from_version,
                        "version": version,
                        "model": chat_config.model,
                        "system_prompt": chat_config.system_prompt,
                        "functions": chat_config.functions,
                        "is_published": True if version == 1 else False,
                    }
                )
                .execute()
                .data[0]
            )

            chat_model_version_uuid: str = chat_model_version["uuid"]

            data = {
                "chat_model_version_uuid": chat_model_version_uuid,
                "version": version,
                "status": "running",
            }
            yield data

        # If session uuid is None, create new session
        if session_uuid is None:
            session_uuid = (
                supabase.table("chat_log_session")
                .insert(
                    {
                        "version_uuid": chat_model_version_uuid,
                        "run_from_deployment": False,
                    }
                )
                .execute()
                .data[0]["uuid"]
            )
            data = {
                "chat_log_session_uuid": session_uuid,
                "status": "running",
            }
            yield data
        else:
            # If session exists, fetch session chat logs from cloud db
            session_chat_logs = (
                supabase.table("chat_log")
                .select("role, content")
                .eq("session_uuid", session_uuid)
                .order("created_at", desc=False)
                .execute()
                .data
            )
            messages.extend(session_chat_logs)
        # Append user input to messages
        messages.append({"role": "user", "content": chat_config.user_input})
        # Stream chat
        res: AsyncGenerator[LLMStreamResponse, None] = chat_model_dev.dev_chat(
            messages=messages,
            model=chat_config.model,
        )

        # TODO: Add function call support
        raw_output = ""
        async for item in res:
            if item.raw_output is not None:
                raw_output += item.raw_output
                data = {
                    "status": "running",
                    "raw_output": item.raw_output,
                }

            if item.error:
                error_log = item.error_log

            yield data

        data = {
            "status": "completed",
        }

        yield data

        # Create chat log
        supabase.table("chat_log").insert(
            {
                "created_at": start_timestampz_iso,
                "session_uuid": session_uuid,
                "role": "user",
                "content": chat_config.user_input,
            }
        ).execute()
        supabase.table("chat_log").insert(
            {
                "session_uuid": session_uuid,
                "role": "assistant",
                "content": raw_output,
            }
        ).execute()

    except Exception as exc:
        logger.error(f"Error running service: {exc}")
        data = {
            "status": "failed",
            "log": str(exc),
        }
        yield data
        return
