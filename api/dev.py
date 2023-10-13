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
    sample_name: Optional[str]
    prompts: List[PromptConfig]
    from_uuid: Optional[str]
    uuid: Optional[str]
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
async def run_llm_module(
    project_uuid:str, dev_name:str, run_config:RunConfig
):
    """
    <h2>For dev branch, Send run_llm_module request to the local server  </h2>
    
    <h3>Input:</h3>
    <ul>
        <li><b>project_uuid:</b> project uuid</li>
        <li><b>dev_name:</b> dev branch name</li>
        <li><b>run_config:</b></li>
        <ul>
            <li>llm_module_name: llm_module name</li>
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
            dictionary = {"test" : {"test1" : "test2"}}
            for i in range(10):
                yield json.dumps(dictionary)
        
        try:
            return StreamingResponse(
                websocket_manager.stream(cli_access_key, LocalTask.RUN_LLM_MODULE, run_config.model_dump())
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
async def list_modules(
    project_uuid: str, dev_name:str
):
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
        response = await websocket_manager.request(cli_access_key, LocalTask.LIST_MODULES)
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
async def list_versions(
    project_uuid:str, dev_name:str, llm_module_uuid:str
):
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
        response = await websocket_manager.request(cli_access_key, LocalTask.LIST_VERSIONS, {"llm_module_uuid": llm_module_uuid})
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
async def get_prompts(
    project_uuid:str, dev_name:str, llm_module_version_uuid:str
):
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
        response = await websocket_manager.request(cli_access_key, LocalTask.GET_PROMPTS, {"llm_module_version_uuid": llm_module_version_uuid})
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
    project_uuid:str, dev_name:str, llm_module_version_uuid:str
):
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
        response = await websocket_manager.request(cli_access_key, LocalTask.GET_RUN_LOGS, {"llm_module_version_uuid": llm_module_version_uuid})
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
    project_uuid: str, version_config: VersionConfig
):
    """Push version to Server DB from local DB  
    Input:  
        - project_uuid : project uuid
        - version_config  
            - llm_module_name: str  
            - llm_module_uuid: str  
            - from_uuid: str  
            - run_logs: List[RunLog]  
                - inputs: Dict[str, Any]  
                - raw_output: str  
                - parsed_outputs: Dict[str, Any]  
            - prompts: List[PromptConfig]  
                - role: str  
                - step: str  
                - content: str  
    """
    try:
        # check llm_module exists
        llm_module = (
            supabase.table("llm_module")
            .select("uuid")
            .eq("project_uuid", project_uuid)
            .eq("name", version_config.llm_module_name)
            .execute()
            .data
        )
        llm_module_uuid = llm_module[0]["uuid"]
        if len(llm_module) == 0:
            # add llm_module first 
            new_llm_module = (
                supabase.table("llm_module")
                .insert(
                    {
                        "name": version_config.llm_module_name,
                        "uuid": version_config.llm_module_uuid,
                        "project_uuid": project_uuid
                    }
                )
                .execute()
                .data
            )
            # llm_module_uuid = new_llm_module[0]['uuid']
        
        llm_module_uuid  = version_config.llm_module_uuid
        
        # insert llm_module_version
        # Candidate 간의 버전 관리는 local에서 이미 이루어진 채로 도달
        candidate_versions = (
            supabase.table("llm_module_version")
            .select("version")
            .eq("llm_module_uuid", llm_module_uuid)
            .order("created_at", desc=True)
            .execute()
            .data
        )
        if len(candidate_versions) == 0:
            latest_version = 0
        else:
            latest_version = candidate_versions[0]["version"]
    
        llm_module_version = (
            supabase.table("llm_module_version")
            .insert(
                {
                    "llm_module_uuid": llm_module_uuid,
                    "is_working" : True,
                    "version": latest_version + 1,
                    "from_uuid" : version_config.from_uuid
                    }
            )
            .execute()
            .data
        )
        
        # add prompts, run_log
        llm_module_version_uuid = llm_module_version[0]['uuid']
        prompts = version_config.prompts
        prompts_dict_list = [p.model_dump() for p in prompts]
        # add "version_uuid" for each prompt
        for p in prompts_dict_list:
            p["version_uuid"] = llm_module_version_uuid
        (
            supabase.table("prompt")
            .insert(prompts_dict_list)
            .execute()
        )
        
        run_logs = version_config.run_logs
        run_logs_dict_list = [r.model_dump() for r in run_logs]
        # add "version_uuid" for each run_log
        for r in run_logs_dict_list:
            r["version_uuid"] = llm_module_version_uuid
            r["is_deployment"] = False
        (
            supabase.table("run_log")
            .insert(run_logs_dict_list)
            .execute()
        )
        
        return JSONResponse({}, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc
    

@router.post("/push_versions")
async def push_versioss(
    project_uuid: str, version_config_list: List[VersionConfig]
):
    """Push version to Server DB from local DB  
    """
    try:
        # check llm_module exists
        exist_llm_modules = (
            supabase.table("llm_module")
            .select("uuid")
            .eq("project_uuid", project_uuid)
            .in_("name", [version_config.llm_module_name for version_config in version_config_list])
            .execute()
            .data
        )
        exist_llm_module_uuids = [llm_module["uuid"] for llm_module in exist_llm_modules]
        
        # insert new llm_modules
        non_exist_llm_modules = [
            version_config 
            for version_config in version_config_list 
            if version_config.llm_module_uuid not in exist_llm_module_uuids
        ]
        non_exist_llm_modules = [
            {
                "name": version_config.llm_module_name,
                "uuid": version_config.llm_module_uuid,
                "project_uuid": project_uuid
            } for version_config in non_exist_llm_modules
        ]
        
        (
            supabase.table("llm_module")
            .insert(non_exist_llm_modules)
            .execute()
        )
        
        # insert llm_module_version
        # Candidate 간의 버전 관리는 local에서 이미 이루어진 채로 도달
        # Add version id
        
        # find latest version of each llm_module
        latest_versions = {}
        llm_module_uuid_list = [version_config.llm_module_uuid for version_config in version_config_list]
        for llm_module_uuid in llm_module_uuid_list:
            last_version = (
                supabase.table("llm_module_version")
                .select("version")
                .eq("llm_module_uuid", llm_module_uuid)
                .order("created_at", desc=True)
                .execute()
            )
            if len(last_version) == 0:
                latest_versions[llm_module_uuid] = 0
            else:
                latest_versions[llm_module_uuid] = last_version[0]["version"]
                
        # Add version ID
        llm_version_list = [
            {
                "llm_module_uuid": version_config.llm_module_uuid,
                "from_uuid" : version_config.from_uuid
            } for version_config in version_config_list
        ]
        for llm_version in llm_version_list:
            llm_version["version"] = latest_versions[llm_version["llm_module_uuid"]] + 1
            latest_versions[llm_version["llm_module_uuid"]] += 1
        
        supabase.table("llm_module_version").insert(llm_version_list).execute().data

        # Inserting all_prompts
        all_prompts = [
            {**p.model_dump(), "version_uuid": version_config.llm_module_uuid}
            for version_config in version_config_list
            for p in version_config.prompts
        ]
        supabase.table("prompt").insert(all_prompts).execute()

        # Inserting all_run_logs
        all_run_logs = [
            {**r.model_dump(), "version_uuid": version_config.llm_module_uuid, "is_deployment": False}
            for version_config in version_config_list
            for r in version_config.run_logs
        ]
        supabase.table("run_log").insert(all_run_logs).execute()
        
        return JSONResponse({}, status_code=HTTP_200_OK)
    except Exception as exc:
        logger.error(exc)
        raise HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR) from exc
    