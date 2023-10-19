from fastapi import WebSocket, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR

from base.database import supabase
from utils.logger import logger

API_KEY_HEADER = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)


def get_project(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return project based on API key."""
    api_key = api_key.replace("Bearer ", "")  # Strip "Bearer " from the header value
    project = (
        supabase.table("project").select("*").eq("api_key", api_key).execute()
    ).data
    if not project:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )

    return project[0]


def get_cli_user_id(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return CLI user based on API key."""
    api_key = api_key.replace("Bearer ", "")  # Strip "Bearer " from the header value
    user_id = (
        supabase.table("cli_access").select("user_id").eq("api_key", api_key).execute()
    ).data
    if not user_id:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )

    return user_id[0]["user_id"]


def get_api_key(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return API key."""
    try:
        api_key = api_key.replace("Bearer ", "")  # Strip "Bearer " from the header value
        return api_key
    except:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )
