"""APIs for promptmodel webpage"""
import json
from operator import eq
import re
import secrets
from typing import Any, AsyncGenerator, Dict, List, Optional, Sequence, Tuple, Union
from click import prompt
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
async def run_prompt_model(dev_uuid: str, run_config: PromptModelRunConfig):
    """Run PromptModel for cloud development environment.

    Args:
        dev_uuid (str): Dev branch uuid
        run_config (PromptModelRunConfig):
            prompt_model_name: str
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


async def run_cloud_dev_llm(dev_uuid: str, run_config: PromptModelRunConfig):
    """Run PromptModel for cloud development environment."""
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
        logger.info(f"Started PromptModel: {run_config.prompt_model_name}")
        # create prompt_model_dev_instance
        prompt_model_dev = LLMDev()
        # find prompt_model_uuid from local db
        prompt_model_version_uuid: Optional[str] = run_config.uuid
        # If prompt_model_version_uuid is None, create new version & prompt
        if prompt_model_version_uuid is None:
            prompt_model_version = (
                supabase.table("prompt_model_version")
                .insert(
                    {
                        "prompt_model_uuid": run_config.prompt_model_uuid,
                        "dev_from_uuid": run_config.from_uuid,
                        "model": run_config.model,
                        "parsing_type": run_config.parsing_type,
                        "output_keys": run_config.output_keys,
                        "functions": run_config.functions,
                        "dev_branch_uuid": dev_uuid,
                        "is_deployed": False,
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
            # send message to backend

            data = {
                "prompt_model_version_uuid": prompt_model_version_uuid,
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

        res: AsyncGenerator[LLMStreamResponse, None] = prompt_model_dev.dev_run(
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

            # Update prompt_model_version status to broken
            supabase.table("prompt_model_version").update(
                {
                    "status": "broken",
                }
            ).eq("uuid", prompt_model_version_uuid).execute()

            # Create run log
            supabase.table("run_log").insert(
                {
                    "version_uuid": prompt_model_version_uuid,
                    "inputs": sample_input,
                    "raw_output": output["raw_output"],
                    "parsed_outputs": output["parsed_outputs"],
                    "dev_branch_uuid": dev_uuid,
                    "run_from_deployment": False,
                }
            ).execute()

            yield data
            return

        data = {
            "status": "completed",
        }

        yield data
        # Update prompt_model_version status to working
        supabase.table("prompt_model_version").update(
            {
                "status": "working",
            }
        ).eq("uuid", prompt_model_version_uuid).execute()

        # Create run log
        supabase.table("run_log").insert(
            {
                "version_uuid": prompt_model_version_uuid,
                "inputs": sample_input,
                "raw_output": output["raw_output"],
                "parsed_outputs": output["parsed_outputs"],
                "dev_branch_uuid": dev_uuid,
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
async def run_chat_model(dev_uuid: str, chat_config: ChatModelRunConfig):
    """Run ChatModel from cloud development environment.

    Args:
        dev_uuid (str): Dev branch uuid
        chat_config (ChatModelRunConfig):
            chat_model_name: str
            model: str
            system_prompt: str
            from_uuid: previous version uuid (Optional)
            uuid: current version uuid (Optional if from_uuid is provided)
            functions: List of functions (Optional)

    Raises:
        HTTPException: _description_
        HTTPException: _description_

    Returns:
        StreamingResponse
            raw_output: str
            status: "completed" | "failed" | "running"
    """

    async def stream_run():
        async for chunk in run_cloud_dev_chat(
            dev_uuid=dev_uuid, chat_config=chat_config
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


async def run_cloud_dev_chat(dev_uuid: str, chat_config: ChatModelRunConfig):
    """Run ChatModel from cloud development environment."""
    try:
        logger.info(f"Started ChatModel: {chat_config.chat_model_uuid}")
        # create chat_model_dev_instance
        chat_model_dev = LLMDev()
        # find chat_model_version_uuid from cloud db
        chat_model_version_uuid: Optional[str] = chat_config.version_uuid
        session_uuid: Optional[str] = chat_config.session_uuid
        # If chat_model_version_uuid is None, create new version
        if chat_model_version_uuid is None:
            print(chat_config.chat_model_uuid)
            print(chat_config.from_uuid)
            print(dev_uuid)
            chat_model_version = (
                supabase.table("chat_model_version")
                .insert(
                    {
                        "chat_model_uuid": chat_config.chat_model_uuid,
                        "dev_from_uuid": chat_config.from_uuid,
                        "model": chat_config.model,
                        "system_prompt": chat_config.system_prompt,
                        "functions": chat_config.functions,
                        "dev_branch_uuid": dev_uuid,
                        "is_deployed": False,
                    }
                )
                .execute()
                .data[0]
            )

            chat_model_version_uuid: str = chat_model_version["uuid"]

            data = {
                "chat_model_version_uuid": chat_model_version_uuid,
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
                        "dev_branch_uuid": dev_uuid,
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

        model = chat_config.model
        messages = [{"role": "system", "content": chat_config.system_prompt}]

        # Fetch session chat logs from cloud db
        session_chat_logs = (
            supabase.table("chat_log")
            .select("role, content")
            .eq("session_uuid", session_uuid)
            .order("created_at", desc=False)
            .execute()
            .data
        )

        messages.extend(session_chat_logs)
        messages.append({"role": "user", "content": chat_config.user_input})

        res: AsyncGenerator[LLMStreamResponse, None] = chat_model_dev.dev_chat(
            messages=messages,
            model=model,
        )

        # TODO: Add function call support
        raw_output = ""
        async for item in res:
            # send item to backend
            # save item & parse
            # if type(item) == str: raw output, if type(item) == dict: parsed output
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
        # Update chat_model_version status to working
        supabase.table("chat_model_version").update(
            {
                "status": "working",
            }
        ).eq("uuid", chat_model_version_uuid).execute()

        # Create chat log
        supabase.table("chat_log").insert(
            [
                {
                    "session_uuid": session_uuid,
                    "role": "user",
                    "content": chat_config.user_input,
                },
                {
                    "session_uuid": session_uuid,
                    "role": "assistant",
                    "content": raw_output,
                },
            ]
        ).execute()
    except Exception as error:
        logger.error(f"Error running service: {error}")
        data = {
            "status": "failed",
            "log": str(error),
        }
        yield data
        return


@router.post("/push_versions")
async def push_versions(
    project_uuid: str,
    dev_uuid: str,
    prompt_model_uuid: Optional[str] = None,
    chat_model_uuid: Optional[str] = None,
):
    """Push version to Server DB from local DB

    Input:
    - project_uuid
    - dev_uuid: uuid
    - prompt_model_uuid: Optional(str) if prompt_model_uuid is given, push only one prompt_model
    - chat_model_uuid: Optional(str) if prompt_model_uuid is given, push only one prompt_model
    """
    try:
        changelogs = []
        changelog_level = 2
        if prompt_model_uuid is None and chat_model_uuid is None:
            # Deploy all prompt_models and chat_models of specified dev environment
            changelogs = deploy_models(
                project_uuid=project_uuid,
                dev_uuid=dev_uuid,
                model_type="prompt_model",
                changelogs=changelogs,
            )
            changelogs = deploy_models(
                project_uuid=project_uuid,
                dev_uuid=dev_uuid,
                model_type="chat_model",
                changelogs=changelogs,
            )
        elif prompt_model_uuid:
            # Deploy only specified prompt_model
            changelogs = deploy_models(
                project_uuid=project_uuid,
                dev_uuid=dev_uuid,
                model_type="prompt_model",
                changelogs=changelogs,
                model_uuid=prompt_model_uuid,
            )
        elif chat_model_uuid:
            # Deploy only specified chat_model
            changelogs = deploy_models(
                project_uuid=project_uuid,
                dev_uuid=dev_uuid,
                model_type="chat_model",
                changelogs=changelogs,
                model_uuid=chat_model_uuid,
            )

        # Update project version & add changelogs
        current_project_version: str = (
            supabase.table("project")
            .select("version")
            .eq("uuid", project_uuid)
            .single()
            .execute()
            .data["version"]
        )
        current_version_levels = current_project_version.split(".")
        if changelog_level == 1:
            new_project_version_levels = [
                str(int(current_version_levels[0]) + 1),
                "0",
                "0",
            ]
        elif changelog_level == 2:
            new_project_version_levels = [
                current_version_levels[0],
                str(int(current_version_levels[1]) + 1),
                "0",
            ]
        new_project_version = ".".join(new_project_version_levels)
        supabase.table("project").update({"version": new_project_version}).eq(
            "uuid", project_uuid
        ).execute()

        # insert project_changelog
        (
            supabase.table("project_changelog")
            .insert(
                {
                    "logs": changelogs,
                    "project_uuid": project_uuid,
                    "level": changelog_level,
                    "previous_version": current_project_version,
                }
            )
            .execute()
        )

        return JSONResponse({}, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


def deploy_models(
    project_uuid: str,
    dev_uuid: str,
    model_type: str,  # prompt_model | chat_model
    changelogs: List[Dict[str, Any]],
    model_uuid: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Deploy models from dev cloud db to deployment cloud db

    Args:
        project_uuid (str): Project uuid
        dev_uuid (str): Dev branch uuid
        model_type (str): prompt_model | chat_model
        model_uuid (Optional[str]): Specific model uuid to deploy. Defaults to None.

    Returns:
        List[Dict[str, Any]]: Appends and returns changelogs
    """
    # Update dev environment's models to deployed
    model_filter = {
        "project_uuid": project_uuid,
        "dev_branch_uuid": dev_uuid,
    }
    if model_uuid:
        model_filter["uuid"] = model_uuid
    (
        supabase.table(model_type)
        .update({"dev_branch_uuid": None})
        .match(model_filter)
        .execute()
    )

    # Get deployed versions
    deployed_versions = (
        supabase.table(f"{model_type}_version")
        .select(f"created_at, uuid, from_uuid, {model_type}_uuid, status, version")
        .eq("is_deployed", True)
        .execute()
        .data
    )
    # Get dev environment versions
    dev_versions = (
        supabase.table(f"{model_type}_version")
        .select(f"created_at, uuid, dev_from_uuid, {model_type}_uuid, status, version")
        .eq("is_deployed", False)
        .eq("dev_branch_uuid", dev_uuid)
        .execute()
        .data
    )

    if model_uuid:
        deployed_versions = list(
            filter(
                lambda version: version[f"{model_type}_uuid"] == model_uuid,
                deployed_versions,
            )
        )
        dev_versions = list(
            filter(
                lambda version: version[f"{model_type}_uuid"] == model_uuid,
                dev_versions,
            )
        )

    # Merge deployed_versions and dev_versions
    all_versions = deployed_versions + dev_versions

    # Get versions to save
    new_versions: List[Dict[str, Any]] = list(
        filter(lambda version: version["status"] == "candidate", dev_versions)
    )

    logger.debug(f"new_versions: {new_versions}")

    if not new_versions:
        return changelogs

    # Set from_uuid of new_versions to the root ancestor version
    for version in new_versions:
        ancestor = None
        temp_version = version
        get_parent_uuid = lambda child: child.get("dev_from_uuid") or child.get(
            "from_uuid"
        )
        if get_parent_uuid(temp_version) is None:
            version["from_uuid"] = None
        else:
            while get_parent_uuid(temp_version) is not None:
                # Find the current parent's parent
                temp_version = next(
                    filter(
                        lambda version: version["uuid"]
                        == get_parent_uuid(temp_version),
                        all_versions,
                    )
                )
                if (
                    temp_version["version"] is not None
                    or temp_version["status"] == "candidate"
                ):
                    ancestor = temp_version
                    break

            # After finding the root version, set 'from_uuid' to the root version's UUID
            logger.debug(f"ancestor: {ancestor}")
            version["from_uuid"] = ancestor["uuid"]

    # get last version(ID) for each prompt_models
    version_model_uuid_list = list(
        set([version[f"{model_type}_uuid"] for version in new_versions])
    )
    previous_version_list = (
        supabase.table(f"{model_type}_version")
        .select(f"version, {model_type}_uuid")
        .in_(f"{model_type}_uuid", version_model_uuid_list)
        .eq("is_deployed", True)
        .execute()
    ).data

    version_uuid_version_num_map = {}
    for previous_version in previous_version_list:
        if previous_version[f"{model_type}_uuid"] not in version_uuid_version_num_map:
            version_uuid_version_num_map[previous_version[f"{model_type}_uuid"]] = int(
                previous_version["version"]
            )
        else:
            version_uuid_version_num_map[previous_version[f"{model_type}_uuid"]] = max(
                version_uuid_version_num_map[previous_version[f"{model_type}_uuid"]],
                int(previous_version["version"]),
            )
    logger.debug(f"previous_versions: {version_uuid_version_num_map}")
    # allocate version(ID) for new versions
    # sort by created_at ascending
    new_candidates = {}
    new_versions = sorted(new_versions, key=lambda x: x["created_at"])
    for new_version in new_versions:
        if new_version[f"{model_type}_uuid"] in version_uuid_version_num_map:
            new_version["version"] = (
                version_uuid_version_num_map[new_version[f"{model_type}_uuid"]] + 1
            )
            version_uuid_version_num_map[new_version[f"{model_type}_uuid"]] += 1
            new_version["is_published"] = False
            new_version["ratio"] = None
        else:
            new_version["version"] = 1
            version_uuid_version_num_map[new_version[f"{model_type}_uuid"]] = 1
            new_version["is_published"] = True
            new_version["ratio"] = 1.0
        new_version["is_deployed"] = True
        new_candidates[new_version["uuid"]] = int(new_version["version"])
    logger.debug(f"new_candidates: {new_candidates}")
    logger.debug(f"new_versions: {new_versions}")
    logger.debug(f"versions: {version_uuid_version_num_map}")

    for new_version in new_versions:
        supabase.table(f"{model_type}_version").update(new_version).eq(
            "uuid", new_version["uuid"]
        ).execute()

    # Push development-stage run_log / chat_log_session to deployment-stage
    if model_type == "prompt_model":
        for new_version in new_versions:
            supabase.table("run_log").update({"dev_branch_uuid": None}).eq(
                "version_uuid", new_version["uuid"]
            ).execute()
    elif model_type == "chat_model":
        for new_version in new_versions:
            supabase.table("chat_log_session").update({"dev_branch_uuid": None}).eq(
                "version_uuid", new_version["uuid"]
            ).execute()

    # make project_changelog level 2, subject = prompt_model_version
    changelogs.append(
        {
            "subject": f"{model_type}_version",
            "identifiers": [version["uuid"] for version in new_versions],
            "action": "ADD",
        }
    )

    return changelogs
