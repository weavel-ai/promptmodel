"""APIs for package management"""
import asyncio
from operator import truediv

from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from pydantic import BaseModel

from fastapi import (
    APIRouter,
    Response,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    Query
)
from fastapi.responses import JSONResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_403_FORBIDDEN,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.security import get_api_key, get_project, get_cli_user_id
from utils.dependency import get_websocket_token
from utils.logger import logger
from base.database import supabase
from base.websocket_connection import websocket_manager
from litellm.utils import completion_cost
router = APIRouter()


@router.get("/check_cli_access")
async def check_cli_access(api_key: str = Depends(get_api_key)):
    """Check if user has CLI access"""
    user_id = (
        supabase.table("cli_access").select("user_id").eq("api_key", api_key).execute()
    ).data
    if not user_id:
        return False # Response(status_code=HTTP_403_FORBIDDEN)
    return True # Response(status_code=HTTP_200_OK)


@router.get("/list_orgs")
async def list_orgs(user_id: str = Depends(get_cli_user_id)):
    """List user's organizations"""
    try:
        res = (
            supabase.table("user_organizations")
            .select("name, slug, organization_id")
            .eq("user_id", user_id)
            .execute()
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/list_projects")
async def list_projects(organization_id: str, user_id: str = Depends(get_cli_user_id)):
    """List projects in organization"""
    try:
        res = (
            supabase.table("project")
            .select("uuid, name, description, version")
            .eq("organization_id", organization_id)
            .execute()
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/check_dev_branch_name")
async def check_dev_branch_name(name: str, user_id: str = Depends(get_cli_user_id)):
    """Check if dev branch name is available"""
    try:
        res = (
            supabase.table("dev_branch")
            .select("name")
            .eq("name", name)
            .execute()
        )
        if res.data:
            print(res.data)
            return False
        else:
            return True
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/get_project_version")
async def get_project_version(
    project_uuid: str, user_id: str = Depends(get_cli_user_id)
):
    """Get project version"""
    try:
        res = (
            supabase.table("project")
            .select("version")
            .eq("uuid", project_uuid)
            .execute()
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

@router.get("/list_llm_modules")
async def list_llm_modules(
    project_uuid: str, user_id: str = Depends(get_cli_user_id)
):
    """Get llm module list in project"""
    try:
        res = (
            supabase.table("llm_module")
            .select("*")
            .eq("project_uuid", project_uuid)
            .execute()
        )
        print(res.data)

        llm_modules = [x['llm_module'] for x in res.data]
        return JSONResponse(llm_modules, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

@router.get("/get_changelog")
async def get_changelog(
    project_uuid: str,
    local_project_version: str,
    levels: List[int] = Query(...),
    user_id: str = Depends(get_cli_user_id)
):
    """Get changelog of project after a certain version
    
    Args:
        - project_uuid (str): uuid of project
        - local_project_version (str): version of local project
        - levels (list[int]): levels of changelog to fetch
    
    """
    try:
        # changelog가 없을 수 있음
        start_point = (
            supabase.table("project_changelog")
            .select("id")
            .eq("project_uuid", project_uuid)
            .eq("previous_version", local_project_version)
            .execute().data
        )
        
        if (len(start_point)) == 0:
            return JSONResponse([], status_code=HTTP_200_OK)
        
        current_version_id = start_point[0]['id']

        res = (
            supabase.table("project_changelog")
            .select("previous_version, logs, level")
            .eq("project_uuid", project_uuid)
            .gte("id", current_version_id)
            .in_("level", levels)
            .order("created_at", desc=False)
            .execute()
        )
        return JSONResponse(res.data, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

@router.get("/pull_project")
async def pull_project(
    project_uuid: str, user_id: str = Depends(get_cli_user_id)
):
    """Pull project from cloud
    
    Return
        - version : project version
        - llm_modules : llm module list
        - llm_module_versions : llm module version list
        - prompts : prompt list
        - run_logs : run log list
    
    """
    try:
        # get project version
        project_version = (
            supabase.table("project")
            .select("version")
            .eq("uuid", project_uuid)
            .single()
            .execute()
            .data["version"]
        )
        # get llm_modules
        llm_modules = (
            supabase.table("llm_module")
            .select("uuid, created_at, name, project_uuid")
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )

        # get versions
        llm_module_versions = (
            supabase.table("llm_module_version")
            # .select("uuid, created_at, version, from_uuid, llm_module_uuid, model, is_published, is_ab_test, parsing_type, output_keys")
            .select("uuid, created_at, version, from_uuid, llm_module_uuid, model, is_published, is_ab_test")
            .in_("llm_module_uuid", [x["uuid"] for x in llm_modules])
            .execute()
            .data
        )
        for llm_module_version in llm_module_versions:
            if llm_module_version['is_ab_test'] is True:
                llm_module_version['is_published'] = True
            del llm_module_version['is_ab_test']

        versions_uuid_list = [x["uuid"] for x in llm_module_versions]
        # get prompts
        prompts = (
            supabase.table("prompt")
            .select("created_at, version_uuid, role, step, content")
            .in_("version_uuid", versions_uuid_list)
            .execute()
            .data
        )

        # get run_logs
        run_logs = (
            supabase.table("run_log")
            .select("created_at, version_uuid, inputs, raw_output, parsed_outputs, is_deployment")
            .in_("version_uuid", versions_uuid_list)
            .eq("is_deployment", "False")
            .execute()
            .data
        )

        res = {
            "project_version" : project_version,
            "llm_modules" : llm_modules,
            "llm_module_versions" : llm_module_versions,
            "prompts" : prompts,
            "run_logs" : run_logs
        }
        
        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc


@router.get("/check_update")
async def check_update(
    cached_version: str, project: dict=Depends(get_project)
):
    """
    Check version between local Cache and cloud,   
    If local version is lower than cloud, return (True, New Version, project_status)  
    Else return (False, New Version, None)  

    Input:  
        - cached_version: local cached version  
        
    Return:
        - need_update: bool  
        - version : str
        - project_status : dict
    """
    try:
        # get project version
        project_version = (
            supabase.table("project")
            .select("version")
            .eq("uuid", project['uuid'])
            .single()
            .execute()
            .data["version"]
        )
        # check if need update
        if project_version == cached_version:
            need_update = False
            res = {
                "need_update" : need_update,
                "version" : project_version,
                "project_status" : None
            }
            return JSONResponse(res, status_code=HTTP_200_OK)
        else:
            need_update = True
        
        # get current project status
        
        # get llm_modules
        llm_modules = (
            supabase.table("llm_module")
            .select("uuid, name")
            .eq("project_uuid", project['uuid'])
            .execute()
            .data
        )

        # get published, ab_test llm_versions
        deployed_llm_module_versions = (
            supabase.table("deployed_llm_module_version")
            .select("uuid, from_uuid, llm_module_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys")
            #.select("uuid, from_uuid, llm_module_uuid, model, is_published, is_ab_test, ratio")
            .in_("llm_module_uuid", [x["uuid"] for x in llm_modules])
            .execute()
            .data
        )

        versions_uuid_list = [x["uuid"] for x in deployed_llm_module_versions]
        # get prompts
        prompts = (
            supabase.table("prompt")
            .select("version_uuid, role, step, content")
            .in_("version_uuid", versions_uuid_list)
            .execute()
            .data
        )

        res = {
            "need_update" : need_update,
            "version" : project_version,
            "project_status" : {
                "llm_modules" : llm_modules,
                "llm_module_versions" : deployed_llm_module_versions,
                "prompts" : prompts,
            }
        }
        
        return JSONResponse(res, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc
    
# Create APIs
@router.post("/create_dev_branch")
async def create_dev_branch(
    name: str, project_uuid: str, user_id: str = Depends(get_cli_user_id)
):
    """
    Args:
        name (str): name of dev branch
        project_uuid (str): uuid of project
    """
    try:
        supabase.table("dev_branch").insert(
            {
                "name": name,
                "project_uuid": project_uuid,
            }
        ).execute()
        return Response(status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc

# promptmodel library local dev server websocket endpoint
@router.websocket("/open_websocket")
async def open_websocket(
    websocket: WebSocket, token: str = Depends(get_websocket_token)
):
    """Initializes a websocket connection with the local dev server."""
    # websocket_connection = await websocket_manager.connect(websocket, token)
    try:
        connection = await websocket_manager.connect(websocket, token)
        await connection
        # while True:
        #     # We can introduce a delay so this loop isn't running all the time.
        #     await asyncio.sleep(
        #         5
        #     )  # This is an arbitrary sleep value, adjust as needed.
    except Exception as error:
        logger.error(f"Error in local dev server websocket for token {token}: {error}")
        websocket_manager.disconnect(token)
        
@router.post("/connect_cli_dev")
async def connect_cli_dev(
    project_uuid: str, branch_name: str, api_key: str = Depends(get_api_key)
):
    """Update cli token for dev branch."""
    try:
        print(project_uuid, branch_name, api_key)
        dev_branch_data = (
            supabase.table("dev_branch")
            .select("*")
            .eq("name", branch_name)
            .eq("project_uuid", project_uuid)
            .single()
            .execute()
            .data
        )
        if dev_branch_data['online'] is True:
            # return false, already connected
            return HTTPException(status_code=HTTP_403_FORBIDDEN, detail="Already connected")
        else:
            # update dev_branch_data
            res = supabase.table("dev_branch").update(
                {
                    "cli_access_key": api_key,
                    "online": False,
                }
            ).eq("id", dev_branch_data['id']).execute()
            # return true, connected
            return Response(status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc
    
    
@router.post("/log_deployment_run")
async def log_deployment_run(
    version_uuid: str,
    inputs: Dict[str, Any],
    api_response: Dict[str, Any],
    parsed_outputs: Dict[str, Any],
    metadata: Dict[str, Any],
    project: dict=Depends(get_project)
):
    try:
        # save log
        # TODO: add function call
        (
            supabase.table("run_log")
            .insert(
                {
                    "inputs" : inputs,
                    "raw_output" : api_response['choices'][0]["message"]['content'],
                    "parsed_outputs" : parsed_outputs,
                    "input_register_name": None,
                    "is_deployment" : True,
                    "version_uuid" : version_uuid,
                    "token_usage": api_response['usage'],
                    "latency" : api_response['response_ms'],
                    "cost": completion_cost(api_response),
                    "metadata": metadata,
                }
            )
            .execute()
        )
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc