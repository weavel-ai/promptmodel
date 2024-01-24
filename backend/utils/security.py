import os
import base64
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import hashlib
import time
from dotenv import load_dotenv
from typing import Annotated
from fastapi import HTTPException, Request, Security, Depends
from fastapi.security.api_key import APIKeyHeader
import httpx
from starlette import status as status_code

from sqlalchemy import Result, select, asc, desc, update

from utils.logger import logger
from base.database import get_session_context
from db_models import *

import jwt

load_dotenv()

API_KEY_HEADER = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)

self_hosted: bool = os.environ.get("NEXT_PUBLIC_SELF_HOSTED", "true")
if self_hosted == "true":
    self_hosted = True
else:
    self_hosted = False

frontend_url = os.getenv("FRONTEND_PUBLIC_URL", "http://localhost:3000")
origins = [frontend_url]


def base64url_to_base64(value):
    padding = "=" * (4 - (len(value) % 4))
    return base64.urlsafe_b64decode(value + padding)


def decode_jwk(jwk):
    """
    Decode a JSON Web Key (JWK) to an RSA public key.

    :param jwk: A dictionary representing the JSON Web Key.
    :return: An RSA public key.
    """
    modulus = int.from_bytes(base64url_to_base64(jwk["n"]), byteorder="big")
    exponent = int.from_bytes(base64url_to_base64(jwk["e"]), byteorder="big")
    public_key = rsa.RSAPublicNumbers(exponent, modulus).public_key(
        serialization.NoEncryption()
    )
    return public_key


async def get_project(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return project based on API key."""
    if not api_key:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    if api_key.lower().startswith("bearer "):
        api_key = api_key[7:]  # Strip "Bearer " from the header value
    async with get_session_context() as session:
        project = (
            await session.execute(select(Project).where(Project.api_key == api_key))
        ).scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    logger.debug(f"api key: {api_key}")
    logger.debug(f"project: {project.name}")

    return project.model_dump()


async def get_project_cli_access_key(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return project based on Cli access key."""
    if not api_key:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    if api_key.lower().startswith("bearer "):
        cli_access_key = api_key[7:]  # Strip "Bearer " from the header value
    async with get_session_context() as session:
        project = (
            await session.execute(
                select(Project).where(Project.cli_access_key == cli_access_key)
            )
        ).scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    logger.debug(f"api key: {api_key}")
    logger.debug(f"project: {project.name}")

    return project.model_dump()


async def get_cli_user_id(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return CLI user based on API key."""
    if api_key.lower().startswith("bearer "):
        api_key = api_key[7:]  # Strip "Bearer " from the header value
    async with get_session_context() as session:
        user_id = (
            await session.execute(
                select(CliAccess.user_id).where(CliAccess.api_key == api_key)
            )
        ).scalar_one()

    if not user_id:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    return user_id


async def get_api_key(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return API key."""
    try:
        if api_key.lower().startswith("bearer "):
            api_key = api_key[7:]  # Strip "Bearer " from the header value
        return api_key
    except:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_jwt(
    request: Request,
    raw_jwt: str = Security(api_key_header),
):
    """Authenticate and return API key."""
    is_public_project = False
    is_authorized = True
    project_uuid = request.headers.get("x-project-uuid")
    if project_uuid:
        async with get_session_context() as session:
            project: Project = (
                await session.execute(
                    select(Project).where(Project.uuid == project_uuid)
                )
            ).scalar_one_or_none()
            if not project:
                is_authorized = False
            if project.is_public:
                is_public_project = True
    try:
        if self_hosted:
            public_key = os.environ.get("NEXTAUTH_SECRET")
            if not raw_jwt:
                is_authorized = False
            # strip Bearer
            if raw_jwt.lower().startswith("bearer "):
                token = raw_jwt[7:]
            if not token:
                is_authorized = False
            try:
                token = jwt.decode(token, public_key, algorithms=["HS512"])
            except jwt.InvalidTokenError as err:
                is_authorized = False

            if "sub" in token and "user_id" not in token:
                token["user_id"] = token["sub"]

            return token
        async with httpx.AsyncClient() as client:
            res = await client.get(os.environ.get("CLERK_JWKS_URL"))
            public_key = decode_jwk(res.json()["keys"][0])

        if not raw_jwt:
            is_authorized = False

        # strip Bearer
        if raw_jwt.lower().startswith("bearer "):
            token = raw_jwt[7:]

        if not token:
            is_authorized = False

        try:
            token = jwt.decode(token, public_key, algorithms=["RS256"])
            is_authorized = True
        except jwt.InvalidTokenError as err:
            print(err)
            is_authorized = False

        if is_authorized:
            return token
        else:
            if not is_public_project:
                raise HTTPException(
                            status_code=status_code.HTTP_401_UNAUTHORIZED,
                            detail="Could not validate credentials",
                        )
            else:
                return {}
    except HTTPException as exception:
        raise exception


async def get_jwt_public(
    request: Request,
    raw_jwt: str = Security(api_key_header),
):
    try:
        if self_hosted:
            public_key = os.environ.get("NEXTAUTH_SECRET")
            if not raw_jwt:
                return {}
            # strip Bearer
            if raw_jwt.lower().startswith("bearer "):
                token = raw_jwt[7:]
            if not token:
                return {}
            try:
                token = jwt.decode(token, public_key, algorithms=["HS512"])
            except jwt.InvalidTokenError as err:
                return {}

            if "sub" in token and "user_id" not in token:
                token["user_id"] = token["sub"]

            return token
        async with httpx.AsyncClient() as client:
            res = await client.get(os.environ.get("CLERK_JWKS_URL"))
            public_key = decode_jwk(res.json()["keys"][0])

        if not raw_jwt:
            return {}
        # strip Bearer
        if raw_jwt.lower().startswith("bearer "):
            token = raw_jwt[7:]

        if not token:
            return {}
        try:
            token = jwt.decode(token, public_key, algorithms=["RS256"])
        except jwt.InvalidTokenError as err:
            print(err)
            return {}

        return token
    except HTTPException as exception:
        raise exception


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
