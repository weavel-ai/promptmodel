"""APIs for promptmodel dev page"""
import secrets
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


class RunConfig(BaseModel):
    llm_module_uuid: str
    llm_module_name: str
    parsing_type: Optional[
        str
    ] = None  # "colon" | "square_bracket" | "double_square_bracket"
    output_keys: Optional[List[str]] = None
    model: str
    sample_name: Optional[str] = None
    prompts: List[PromptConfig]
    from_uuid: Optional[str] = None
    uuid: Optional[str] = None
    parsing_type: Optional[str] = "double_square_bracket"
    model: Optional[str] = "gpt-3.5-turbo"


class RunLog(BaseModel):
    inputs: Dict[str, Any]
    raw_output: str
    parsed_outputs: Dict[str, Any]


class VersionConfig(BaseModel):
    llm_module_name: str
    llm_module_uuid: str
    from_uuid: str
    run_logs: List[RunLog]
    prompts: List[PromptConfig]


@router.post("/run_llm_module")
async def run_llm_module(project_uuid: str, dev_name: str, run_config: RunConfig):
    """
    <h2>For dev branch, Send run_llm_module request to the local server  </h2>

    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>dev_name:</b> dev branch name</li>
        <li><b>run_config:</b></li>
        <ul>
            <li>llm_module_name: llm_module name</li>
            <li>parsing_type: "colon" | "square_bracket" | "double_square_bracket" | None (Optional)</li>
            <li>output_keys: List[str] | None (Optional)</li>
            <li>model: model name</li>
            <li>sample_name : sample name (Optional)  </li>
            <li>prompts : list of prompts (type, step, content)  </li>
            <li>from_uuid : previous version uuid (Optional) </li>
            <li>uuid : current uuid (optional if run_previous)  </li>
            <li>parsing_type: parsing type (colon, square_bracket, double_square_bracket)  </li>
            <li>model: model_name</li>
        </ul>
    </ul>

    <h3>Output:</h3>
    <ul>
        <li><b>StreamingResponse  </b></li>
        <ul>
        <li>raw_output: str  </li>
        <li>parsed_outputs: dict  </li>
        <li>status: str = completed | failed | running  </li>
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

        async def _test():
            dictionary = {"test": {"test1": "test2"}}
            for i in range(10):
                yield json.dumps(dictionary)

        try:
            return StreamingResponse(
                websocket_manager.stream(
                    cli_access_key, LocalTask.RUN_LLM_MODULE, run_config.model_dump()
                )
                # _test()
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


@router.get("/list_modules")
async def list_modules(project_uuid: str, dev_name: str):
    """Get list of llm modules in local DB by websocket
    Input:
        - project_uuid : project uuid
        - dev_name : dev branch name

    Output:
        Response
            - correlation_id: str
            - llm_modules: list
                - local_usage
                - is_deployment
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
            cli_access_key, LocalTask.LIST_MODULES
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


@router.get("/list_versions")
async def list_versions(project_uuid: str, dev_name: str, llm_module_uuid: str):
    """Get list of llm module versions for llm_module_uuid in local DB by websocket
    Input:
        - project_uuid : project uuid
        - dev_name : dev branch name
        - llm_module_uuid : llm_module uuid

    Output:
        Response
            - correlation_id: str
            - llm_module_versions: list
                - uuid
                - from_uuid
                - llm_module_uuid
                - status
                - model
                - candidate_version
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
            LocalTask.LIST_VERSIONS,
            {"llm_module_uuid": llm_module_uuid},
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


@router.get("/get_prompts")
async def get_prompts(project_uuid: str, dev_name: str, llm_module_version_uuid: str):
    """Get list of prompts of llm_module_version_uuid in local DB by websocket

    Args:
        project_uuid (str): project_uuid
        dev_name (str): dev_name
        llm_module_version_uuid (str): version uuid

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
            {"llm_module_version_uuid": llm_module_version_uuid},
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
async def get_run_logs(project_uuid: str, dev_name: str, llm_module_version_uuid: str):
    """Get list of run_logs of llm_module_version_uuid in local DB by websocket

    Args:
        project_uuid (str): project_uuid
        dev_name (str): dev_name
        llm_module_version_uuid (str): version uuid

    Returns:
        Response
            - version_uuid
            - inputs
            - raw_output
            - parsed_outputs
            - is_deployment
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
            {"llm_module_version_uuid": llm_module_version_uuid},
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


@router.post("/change_version_status")
async def change_version_status(
    project_uuid: str, dev_name: str, llm_module_version_uuid: str, status: str
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
            LocalTask.CHANGE_VERSION_STATUS,
            {"llm_module_version_uuid": llm_module_version_uuid, "status": status},
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
async def push_version(project_uuid: str, dev_name: str, llm_module_version_uuid: str):
    """Push 1 version to Server DB from local DB"""
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
            LocalTask.GET_VERSION_TO_SAVE,
            {"llm_module_version_uuid": llm_module_version_uuid},
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

        # save llm_module_versions to server DB

        # if there are llm_modules (which is only in local), save
        llm_modules = response["llm_modules"]
        if llm_modules:
            (supabase.table("llm_module").insert(llm_modules).execute())

        version = response["version"]
        # get last version(ID)
        last_version = (
            supabase.table("llm_module_version")
            .select("version")
            .eq("llm_module_uuid", version["llm_module_uuid"])
            .order("version", desc=True)
            .execute()
        )
        if len(last_version) == 0:
            version["version"] = 1
        else:
            version["version"] = last_version[0]["version"] + 1

        (supabase.table("llm_module_version").insert(version).execute())

        prompts = response["prompts"]
        (supabase.table("prompt").insert(prompts).execute())

        new_candidates = {version["uuid"]: version["version"]}

        await websocket_manager.send_message(
            cli_access_key,
            LocalTask.UPDATE_CANDIDATE_VERSION_ID,
            {"new_candidates": new_candidates},
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
    project_uuid: str, dev_name: str, llm_module_uuid: Optional[str] = None
):
    """Push version to Server DB from local DB

    Input:
    - project_uuid
    - dev_name
    - module_uuid: Optional(str) if module_uuid is given, push only one module
    """
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

        data = {}
        if llm_module_uuid:
            data["llm_module_uuid"] = llm_module_uuid

        response = await websocket_manager.request(
            cli_access_key, LocalTask.GET_VERSIONS_TO_SAVE, data
        )
        if not response:
            raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR)

        # save llm_module_versions to server DB

        # if there are llm_modules (which is only in local), save them
        llm_modules = response["llm_modules"]
        if len(llm_modules) > 0:
            (supabase.table("llm_module").insert(llm_modules).execute())

        new_versions = list(
            map(
                lambda version: (
                    (
                        version.update(
                            {"llm_module_uuid": version["llm_module_uuid"]}
                        ),
                        version,
                    )[1]
                ),
                response["versions"],
            )
        )
        # get last version(ID) for each llm_modules
        version_llm_module_uuid_list = list(
            set([version["llm_module_uuid"] for version in new_versions])
        )
        previous_version_list = (
            supabase.table("llm_module_version")
            .select("version, llm_module_uuid")
            .in_("llm_module_uuid", version_llm_module_uuid_list)
            .execute()
        ).data
        last_versions = {}
        for previous_version in previous_version_list:
            if previous_version["llm_module_uuid"] not in last_versions:
                last_versions[previous_version["llm_module_uuid"]] = previous_version[
                    "version"
                ]
            else:
                last_versions[previous_version["llm_module_uuid"]] = max(
                    last_versions[previous_version["llm_module_uuid"]],
                    previous_version["version"],
                )

        # allocate version(ID) for new versions
        # sort by created_at ascending
        new_candidates = {}
        new_versions = sorted(new_versions, key=lambda x: x["created_at"])
        for new_version in new_versions:
            new_version["version"] = last_versions[new_version["llm_module_uuid"]] + 1
            last_versions[new_version["llm_module_uuid"]] += 1
            new_candidates[new_version["uuid"]] = new_version["version"]
        (supabase.table("llm_module_version").insert(new_versions).execute())
        prompts = list(
            map(
                lambda prompt: (
                    (
                        prompt.update({"version_uuid": prompt["version_uuid"]}),
                        prompt,
                    )[1]
                ),
                response["prompts"],
            )
        )
        (supabase.table("prompt").insert(prompts).execute())

        print(f"new candidates: {new_candidates}")
        await websocket_manager.send_message(
            cli_access_key,
            LocalTask.UPDATE_CANDIDATE_VERSION_ID,
            {"new_candidates": new_candidates},
        )
        return JSONResponse({}, status_code=HTTP_200_OK)

    except ValueError as ve:
        logger.error(ve)
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST) from ve
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc
