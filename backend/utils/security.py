import os
import base64
import hashlib
import time
from dotenv import load_dotenv
from typing import Annotated
from fastapi import HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR

from sqlalchemy import Result, select, asc, desc, update

from utils.logger import logger
from base.database import get_session_context
from db_models import *

from starlette.requests import Request
import jwt
from jose.exceptions import JWEError
from fastapi_nextauth_jwt.cookies import extract_token
from fastapi_nextauth_jwt.exceptions import InvalidTokenError, MissingTokenError


load_dotenv()

API_KEY_HEADER = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)
self_hosted: bool = os.environ.get("NEXT_PUBLIC_SELF_HOSTED", "true")
if self_hosted == "true":
    self_hosted = True
else:
    self_hosted = False


frontend_url = os.getenv("FRONTEND_PUBLIC_URL", "https://localhost:3000")
origins = [frontend_url, "https://127.0.0.1:3000"]


class ClerkJWT:
    def __init__(self):
        pem_base64 = os.environ.get("CLERK_PEM_KEY")
        self.public_key = base64.b64decode(pem_base64).decode("utf-8")
        self.cookie_name = "__session"

    def __call__(self, request: Request):
        token = extract_token(request.headers, self.cookie_name)
        if not token:
            raise MissingTokenError("No token found in request.")
        try:
            token = jwt.decode(token, self.public_key, algorithms=["RS256"])
        except JWEError as err:
            raise InvalidTokenError("Invalid token.") from err

        # check if token is expired
        current_time = time.time()
        if current_time > token["exp"]:
            raise Exception("Token has expired")
        if current_time < token["nbf"]:
            raise Exception("Token not yet valid")

        # Validate 'azp' claim
        if token["azp"] not in origins:
            raise Exception("Invalid 'azp' claim")

        token["user_id"] = token["sub"]

        return token


if self_hosted:
    JWT = (
        NextAuthJWT()
    )  # TODO: It will not work. NextAuthJWT use cookies and we need to use headers
else:
    JWT = ClerkJWT()


async def get_user_id(
    jwt: Annotated[Dict, Depends(JWT)],
):
    print(jwt)
    return jwt["user_id"]


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
