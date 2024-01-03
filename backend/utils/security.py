import os
import base64
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import hashlib
import time
from dotenv import load_dotenv
from typing import Annotated
from fastapi import HTTPException, Security, Depends
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
    api_key = api_key.replace("Bearer ", "")  # Strip "Bearer " from the header value
    async with get_session_context() as session:
        project = (
            (await session.execute(select(Project).where(Project.api_key == api_key)))
            .scalars()
            .one()
        )

    logger.debug(f"api key: {api_key}")
    logger.debug(f"project: {project.name}")

    if not project:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
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
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    return user_id


async def get_api_key(
    api_key: str = Security(api_key_header),
):
    """Authenticate and return API key."""
    try:
        print("hi", api_key)
        api_key = api_key.replace(
            "Bearer ", ""
        )  # Strip "Bearer " from the header value
        print(api_key)
        return api_key
    except:
        raise HTTPException(
            status_code=status_code.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


async def get_jwt(
    raw_jwt: str = Security(api_key_header),
):
    """Authenticate and return API key."""
    try:
        if self_hosted:
            public_key = os.environ.get("NEXTAUTH_SECRET")
            if not raw_jwt:
                raise HTTPException(
                    status_code=status_code.HTTP_401_UNAUTHORIZED,
                    detail="No token found in request header.",
                )
            # strip Bearer
            if raw_jwt.lower().startswith("bearer "):
                token = raw_jwt[7:]
            if not token:
                raise HTTPException(
                    status_code=status_code.HTTP_401_UNAUTHORIZED,
                    detail="No token found in request.",
                )
            try:
                token = jwt.decode(token, public_key, algorithms=["HS512"])
            except jwt.InvalidTokenError as err:
                raise HTTPException(
                    status_code=status_code.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token.",
                ) from err

            if "sub" in token and "user_id" not in token:
                token["user_id"] = token["sub"]

            return token
        async with httpx.AsyncClient() as client:
            res = await client.get(os.environ.get("CLERK_JWKS_URL"))
            public_key = decode_jwk(res.json()["keys"][0])

        if not raw_jwt:
            raise HTTPException(
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                detail="No token found in request Header.",
            )
        # strip Bearer
        if raw_jwt.lower().startswith("bearer "):
            token = raw_jwt[7:]

        if not token:
            raise HTTPException(
                status_code=status_code.HTTP_401_UNAUTHORIZED,
                detail="No token found in request.",
            )
        try:
            token = jwt.decode(token, public_key, algorithms=["RS256"])
        except jwt.InvalidTokenError as err:
            print(err)
            raise HTTPException(
                status_code=status_code.HTTP_401_UNAUTHORIZED, detail="Invalid token."
            ) from err

        # check if token is expired
        current_time = time.time()
        if current_time > token["exp"]:
            raise Exception("Token has expired")
        if current_time < token["nbf"]:
            raise Exception("Token not yet valid")

        # Validate 'azp' claim
        if token["azp"] not in origins:
            raise Exception("Invalid 'azp' claim")

        if "sub" in token and "user_id" not in token:
            token["user_id"] = token["sub"]

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
