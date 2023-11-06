"""APIs for promptmodel webpage"""
import json
import re
import secrets
from typing import Any, AsyncGenerator, Dict, List, Optional, Sequence, Tuple, Union
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from promptmodel.llms.llm_dev import LLMDev
from promptmodel.utils.types import LLMStreamResponse

from utils.security import get_project
from utils.logger import logger
from base.database import supabase
from api.dev import RunConfig

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


@router.post("/run_llm_module")
async def run_llm_module(dev_uuid: str, run_config: RunConfig):
    """Run LLM module for cloud development environment.

    Args:
        dev_name (str): Dev branch uuid
        run_config (RunConfig):
            llm_module_name: str
            model: str
            prompts: List of prompts (type, step, content)
            from_uuid: previous version uuid (Optional)
            uuid: current version uuid (Optional if from_uuid is provided)
            parsing_type: ParsingType (colon, square_bracket, double_square_bracket, html)
    Output:
        StreamingResponse
            raw_output: str
            parsed_outputs: Dict
            status: "completed" | "failed" | "running"
    """

    async def stream_run():
        async for chunk in run_cloud_dev_llm(dev_uuid=dev_uuid, run_config=run_config):
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


async def run_cloud_dev_llm(dev_uuid: str, run_config: RunConfig):
    """Run LLM module for cloud development environment."""
    sample_input: Dict[str, Any] = {}
    # get sample from db
    if run_config.sample_name:
        sample_input_row: Dict = {}  # TODO: get sample from cloud DB
        if sample_input_row is None or "contents" not in sample_input_row:
            logger.error(f"There is no sample input {run_config.sample_name}.")
            return
        sample_input = sample_input_row["contents"]
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
        logger.info(f"Started PromptModel: {run_config.llm_module_name}")
        # create llm_module_dev_instance
        llm_module_dev = LLMDev()
        # fine llm_module_uuid from local db
        llm_module_uuid: str = (
            supabase.table("llm_module")
            .select("uuid")
            .eq("name", run_config.llm_module_name)
            .single()
            .execute()
            .data["uuid"]
        )
        llm_module_version_uuid: Optional[str] = run_config.uuid
        # If llm_module_version_uuid is None, create new version & prompt
        if llm_module_version_uuid is None:
            llm_module_version = (
                supabase.table("llm_module_version")
                .insert(
                    {
                        "llm_module_uuid": llm_module_uuid,
                        "from_uuid": run_config.from_uuid,
                        "model": run_config.model,
                        "parsing_type": run_config.parsing_type,
                        "output_keys": run_config.output_keys,
                        "functions": run_config.functions,
                        "dev_branch_uuid": dev_uuid,
                    }
                )
                .execute()
                .data[0]
            )

            llm_module_version_uuid: str = llm_module_version["uuid"]

            for prompt in run_config.prompts:
                supabase.table("prompt").insert(
                    {
                        "version_uuid": llm_module_version_uuid,
                        "role": prompt.role,
                        "step": prompt.step,
                        "content": prompt.content,
                    }
                ).execute()
            # send message to backend

            data = {
                "llm_module_version_uuid": llm_module_version_uuid,
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
            messages_for_run = [
                {
                    "content": prompt.content.format(**sample_input),
                    "role": prompt.role,
                }
                for prompt in prompts
            ]
        else:
            messages_for_run = prompts

        parsing_success = True
        error_log = None
        # NOTE : Function call is not supported in cloud development environment

        res: AsyncGenerator[LLMStreamResponse, None] = llm_module_dev.dev_run(
            messages=[message.model_dump() for message in messages_for_run],
            parsing_type=parsing_type,
            model=model,
        )
        async for item in res:
            # send item to backend
            # save item & parse
            # if type(item) == str: raw output, if type(item) == dict: parsed output
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

            # Update llm_module_version status to broken
            supabase.table("llm_module_version").update(
                {
                    "status": "broken",
                }
            ).eq("uuid", llm_module_version_uuid).execute()

            # Create run log
            supabase.table("run_log").insert(
                {
                    "version_uuid": llm_module_version_uuid,
                    "inputs": sample_input,
                    "raw_output": output["raw_output"],
                    "parsed_outputs": output["parsed_outputs"],
                    "dev_branch_uuid": dev_uuid,
                }
            ).execute()

            yield data
            return

        data = {
            "status": "completed",
        }

        yield data
        # Update llm_module_version status to working
        supabase.table("llm_module_version").update(
            {
                "status": "working",
            }
        ).eq("uuid", llm_module_version_uuid).execute()

        # Create run log
        supabase.table("run_log").insert(
            {
                "version_uuid": llm_module_version_uuid,
                "inputs": sample_input,
                "raw_output": output["raw_output"],
                "parsed_outputs": output["parsed_outputs"],
                "dev_branch_uuid": dev_uuid,
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
