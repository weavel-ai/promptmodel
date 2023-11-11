"""APIs for promptmodel dev page"""
import json
from pydantic import BaseModel
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

from fastapi import APIRouter, Response, HTTPException, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.security import get_project
from utils.logger import logger
from base.database import supabase
from base.websocket_connection import websocket_manager, LocalTask

router = APIRouter()


class PromptConfig(BaseModel):
    role: str
    step: int
    content: str


class PromptModelRunConfig(BaseModel):
    prompt_model_uuid: str
    prompt_model_name: str
    prompts: List[PromptConfig]
    model: Optional[str] = "gpt-3.5-turbo"
    from_uuid: Optional[str] = None
    uuid: Optional[str] = None
    sample_name: Optional[str] = None
    parsing_type: Optional[str] = None
    output_keys: Optional[List[str]] = None
    functions: Optional[List[str]] = []


class RunLog(BaseModel):
    inputs: Dict[str, Any]
    raw_output: str
    parsed_outputs: Dict[str, Any]


@router.post("/run_prompt_model")
async def run_prompt_model(
    project_uuid: str, dev_name: str, run_config: PromptModelRunConfig
):
    """
    <h2>For dev branch, Send run_prompt_model request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>dev_name:</b> dev branch name</li>
        <li><b>run_config:</b></li>
        <ul>
            <li>prompt_model_name: prompt_model name</li>
            <li>prompt_model_uuid: prompt_model uuid</li>
            <li>output_keys: List[str] | None (Optional)</li>
            <li>model: model name</li>
            <li>sample_name : sample name (Optional)  </li>
            <li>prompts : list of prompts (type, step, content)  </li>
            <li>from_uuid : previous version uuid (Optional) </li>
            <li>uuid : current uuid (optional if run_previous)  </li>
            <li>parsing_type: parsing type (colon, square_bracket, double_square_bracket, html, None)  </li>
            <li>functions : list of function names (Optional[List[str]])  </li>
        </ul>
    </ul>

    <h3>Output:</h3>
    <ul>
        <li><b>StreamingResponse  </b></li>
        <ul>
        <li>raw_output: str  </li>
        <li>parsed_outputs: dict  </li>
        <li>status: str = completed | failed | running  </li>
        <li>function_call: dict </li>
        </ul>
    </ul>
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")
        cli_access_key = dev_branch[0]["cli_access_key"]

        try:
            return StreamingResponse(
                websocket_manager.stream(
                    cli_access_key, LocalTask.RUN_PROMPT_MODEL, run_config.model_dump()
                )
            )
        except Exception as exc:
            logger.error(exc)
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_prompt_models")
async def list_prompt_models(project_uuid: str, dev_name: str):
    """Get list of prompt models in local DB by websocket
    Input:
        - project_uuid : project uuid
        - dev_name : dev branch name

    Output:
        Response
            - correlation_id: str
            - prompt_models: list
                - used_in_code
                - is_deployed
                - uuid
                - name

    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_PROMPT_MODELS
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_prompt_model_versions")
async def list_prompt_model_versions(
    project_uuid: str, dev_name: str, prompt_model_uuid: str
):
    """Get list of prompt model versions for prompt_model_uuid in local DB by websocket
    Input:
        - project_uuid : project uuid
        - dev_name : dev branch name
        - prompt_model_uuid : prompt_model uuid

    Output:
        Response
            - correlation_id: str
            - prompt_model_versions: list
                - uuid
                - from_uuid
                - prompt_model_uuid
                - status
                - model
                - version
                - parsint_type
                - output_keys
                - functions
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")
        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.LIST_PROMPT_MODEL_VERSIONS,
            {"prompt_model_uuid": prompt_model_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_samples")
async def list_samples(
    project_uuid: str,
    dev_name: str,
):
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_SAMPLES, {}
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_functions")
async def list_functions(
    project_uuid: str,
    dev_name: str,
):
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key, LocalTask.LIST_FUNCTIONS, {}
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_prompts")
async def get_prompts(project_uuid: str, dev_name: str, prompt_model_version_uuid: str):
    """Get list of prompts of prompt_model_version_uuid in local DB by websocket

    Args:
        project_uuid (str): project_uuid
        dev_name (str): dev_name
        prompt_model_version_uuid (str): version uuid

    Returns:
        Response
            - version_uuid
            - type
            - step
            - content
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.GET_PROMPTS,
            {"prompt_model_version_uuid": prompt_model_version_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_run_logs")
async def get_run_logs(
    project_uuid: str, dev_name: str, prompt_model_version_uuid: str
):
    """Get list of run_logs of prompt_model_version_uuid in local DB by websocket

    Args:
        project_uuid (str): project_uuid
        dev_name (str): dev_name
        prompt_model_version_uuid (str): version uuid

    Returns:
        Response
            - version_uuid
            - inputs
            - raw_output
            - parsed_outputs
            - run_from_deployment
    """
    # If the API key in header is valid, this function will execute.
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.GET_RUN_LOGS,
            {"prompt_model_version_uuid": prompt_model_version_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/change_prompt_model_version_status")
async def change_prompt_model_version_status(
    project_uuid: str, dev_name: str, prompt_model_version_uuid: str, status: str
):
    try:
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]
        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.CHANGE_PROMPT_MODEL_VERSION_STATUS,
            {"prompt_model_version_uuid": prompt_model_version_uuid, "status": status},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)
        return JSONResponse(response, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.post("/push_version")
async def push_version(
    project_uuid: str, dev_name: str, prompt_model_version_uuid: str
):
    """Push 1 version to Server DB from local DB"""
    try:
        changelogs = []
        changelog_level = 2
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]

        response = await websocket_manager.request(
            cli_access_key,
            LocalTask.GET_PROMPT_MODEL_VERSION_TO_SAVE,
            {"prompt_model_version_uuid": prompt_model_version_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

        # save prompt_model_versions to server DB

        # if there are prompt_models (which is only in local), save
        prompt_model = response["prompt_model"]
        if prompt_model:
            prompt_model["id"]
            prompt_model["is_deployed"] = True
            (supabase.table("prompt_model").insert(prompt_model).execute())
            changelogs.append(
                {
                    "subject": "prompt_model",
                    "identifiers": [prompt_model["uuid"]],
                    "action": "ADD",
                }
            )
            changelog_level = 1

        version = response["version"]
        version["is_deployed"] = True
        del version["id"]
        # get last version(ID)
        last_version = (
            supabase.table("prompt_model_version")
            .select("version")
            .eq("prompt_model_uuid", version["prompt_model_uuid"])
            .eq("is_deployed", True)
            .order("version", desc=True)
            .execute()
        )
        if len(last_version) == 0:
            version["version"] = 1
            version[
                "is_published"
            ] = True  # If there is no previous version, publish it
            version["ratio"] = 1.0
        else:
            version["version"] = last_version[0]["version"] + 1

        (supabase.table("prompt_model_version").insert(version).execute())

        prompts = response["prompts"]
        (supabase.table("prompt").insert(prompts).execute())

        new_candidates = {version["uuid"]: version["version"]}

        await websocket_manager.send_message(
            cli_access_key,
            LocalTask.UPDATE_CANDIDATE_PROMPT_MODEL_VERSION_ID,
            {"new_candidates": new_candidates},
        )

        # make project_changelog level 2, subject = prompt_model_version
        changelogs.append(
            {
                "subject": "prompt_model_version",
                "identifiers": [version["uuid"]],
                "action": "ADD",
            }
        )

        # update project_version
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


@router.post("/push_versions")
async def push_versions(
    project_uuid: str,
    dev_name: str,
    prompt_model_uuid: Optional[str] = None,
    chat_model_uuid: Optional[str] = None,
):
    """Push version to Server DB from local DB

    Input:
    - project_uuid
    - dev_name
    - prompt_model_uuid: Optional(str) if prompt_model_uuid is given, push only one prompt_model
    """
    try:
        changelogs = []
        changelog_level = 2
        # Find local server websocket
        dev_branch = (
            supabase.table("dev_branch")
            .select("cli_access_key")
            .eq("name", dev_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(dev_branch) == 0:
            raise ValueError("There is no dev_branch")

        cli_access_key = dev_branch[0]["cli_access_key"]

        data = {}
        if prompt_model_uuid:
            data["prompt_model_uuid"] = prompt_model_uuid

        response = await websocket_manager.request(
            cli_access_key, LocalTask.GET_PROMPT_MODEL_VERSIONS_TO_SAVE, data
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

        # save prompt_model_versions to server DB

        # if there are prompt_models (which is only in local), save them
        prompt_models = response["prompt_models"]
        if len(prompt_models) > 0:
            # add prompt_model["is_deployed"] = True
            # for prompt_model in prompt_models:
            #     prompt_model["is_deployed"] = True

            (supabase.table("prompt_model").insert(prompt_models).execute())
            # make changelog level 1, subject = prompt_model
            changelogs.append(
                {
                    "subject": "prompt_model",
                    "identifiers": [
                        prompt_model["uuid"] for prompt_model in prompt_models
                    ],
                    "action": "ADD",
                }
            )
            changelog_level = 1

        new_versions = list(
            map(
                lambda version: (
                    (
                        version.update(
                            {"prompt_model_uuid": version["prompt_model_uuid"]}
                        ),
                        version,
                    )[1]
                ),
                response["versions"],
            )
        )
        # get last version(ID) for each prompt_models
        version_prompt_model_uuid_list = list(
            set([version["prompt_model_uuid"] for version in new_versions])
        )
        previous_version_list = (
            supabase.table("prompt_model_version")
            .select("version, prompt_model_uuid")
            .in_("prompt_model_uuid", version_prompt_model_uuid_list)
            .eq("is_deployed", True)
            .execute()
        ).data

        last_versions = {}
        for previous_version in previous_version_list:
            if previous_version["prompt_model_uuid"] not in last_versions:
                last_versions[previous_version["prompt_model_uuid"]] = int(
                    previous_version["version"]
                )
            else:
                last_versions[previous_version["prompt_model_uuid"]] = max(
                    last_versions[previous_version["prompt_model_uuid"]],
                    int(previous_version["version"]),
                )

        # allocate version(ID) for new versions
        # sort by created_at ascending
        new_candidates = {}
        new_versions = sorted(new_versions, key=lambda x: x["created_at"])
        for new_version in new_versions:
            new_version["is_deployed"] = True
            if new_version["prompt_model_uuid"] in last_versions:
                new_version["version"] = (
                    last_versions[new_version["prompt_model_uuid"]] + 1
                )
                last_versions[new_version["prompt_model_uuid"]] += 1
                new_version["is_published"] = False
                new_version["ratio"] = None
            else:
                new_version["version"] = 1
                last_versions[new_version["prompt_model_uuid"]] = 1
                new_version[
                    "is_published"
                ] = True  # If there is no previous version, publish it
                new_version["ratio"] = 1.0
            new_candidates[new_version["uuid"]] = int(new_version["version"])

        (supabase.table("prompt_model_version").insert(new_versions).execute())
        prompts = response["prompts"]
        (supabase.table("prompt").insert(prompts).execute())

        # print(f"new candidates: {new_candidates}")
        await websocket_manager.send_message(
            cli_access_key,
            LocalTask.UPDATE_CANDIDATE_PROMPT_MODEL_VERSION_ID,
            {"new_candidates": new_candidates},
        )

        # make project_changelog level 2, subject = prompt_model_version
        changelogs.append(
            {
                "subject": "prompt_model_version",
                "identifiers": [version["uuid"] for version in new_versions],
                "action": "ADD",
            }
        )
        # update project_version
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
