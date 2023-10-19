"""APIs for promptmodel webpage"""
import secrets
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)

from utils.security import get_project
from utils.logger import logger
from base.database import supabase

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
