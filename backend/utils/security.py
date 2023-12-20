import hashlib
from typing import Annotated
from fastapi import WebSocket, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

from utils.logger import logger
from base.database import get_session, get_session_context
from db_models import *

API_KEY_HEADER = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)


async def get_project(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return project based on API key."""
    api_key = api_key.replace("Bearer ", "")  # Strip "Bearer " from the header value
    async with get_session_context() as session:
        project = (
            (await session.execute(select(Project).where(Project.api_key == api_key)))
            .scalars()
            .one()
        )

    logger.debug(f"api key: {api_key}")
    logger.debug(f"project: {project}")

    if not project:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )

    return project.model_dump()


async def get_cli_user_id(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return CLI user based on API key."""
    api_key = api_key.replace("Bearer ", "")  # Strip "Bearer " from the header value
    async with get_session_context() as session:
        user_id = (
            await session.execute(
                select(CliAccess.user_id).where(CliAccess.api_key == api_key)
            )
        ).scalar_one()

    if not user_id:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )

    return user_id


async def get_api_key(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return API key."""
    try:
        api_key = api_key.replace(
            "Bearer ", ""
        )  # Strip "Bearer " from the header value
        return api_key
    except:
        raise HTTPException(
            status_code=HTTP_403_FORBIDDEN, detail="Could not validate credentials"
        )


def create_hashed_identifier(prefix: str, value: str):
    """Create a hashed identifier from a prefix and value."""
    # Hash the value
    hash_object = hashlib.sha256(value.encode())
    hex_dig = hash_object.hexdigest()

    # Truncate the hash for the identifier and prepend the prefix
    identifier = f"{prefix}_{hex_dig[:24]}"
    return identifier


# Utility function to hash a password
def hash_password(password):
    return pwd_context.hash(password)
