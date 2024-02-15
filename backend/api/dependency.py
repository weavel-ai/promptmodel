from fastapi import WebSocket, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

from base.database import get_session, get_session_context
from utils.logger import logger
from db_models import *

API_KEY_HEADER = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)

async def get_user_id(
    authorization: str = Depends(api_key_header),
    session: AsyncSession = Depends(get_session),
):
    if not authorization:
        raise HTTPException(status_code=400, detail="Authorization header is required!")
    auth_header = authorization.split(" ")
    if len(auth_header) != 2:
        raise HTTPException(status_code=400, detail="Invalid authorization header!")
    user_id = auth_header[1]
    try:
        user = (
            (await session.execute(select(User.user_id).where(User.user_id == user_id)))
            .one()
            ._mapping
        )

        # logger.debug(f"User authorized: {user}")
        if not user:  # You can further validate the token here if necessary
            raise HTTPException(status_code=400, detail="Token is required!")
        return user_id
    except Exception as error:
        logger.error(f"Error validating token: {error}")
        raise HTTPException(status_code=400, detail="Invalid token!")


async def get_websocket_token(websocket: WebSocket):
    if websocket:
        authorization = websocket.headers.get("Authorization")
        if not authorization:
            await websocket.close(code=4000)
            raise HTTPException(
                status_code=400, detail="Authorization header is required!"
            )
    else:
        # You can handle the HTTP case here if necessary
        raise HTTPException(status_code=400, detail="Not a WebSocket request.")

    token = authorization.split(" ")[1]
    try:
        async with get_session_context() as session:
            project = (
                (
                    await session.execute(
                        select(Project.id, Project.name).where(
                            Project.cli_access_key == token
                        )
                    )
                )
                .mappings()
                .all()
            )

        if not project or len(project) == 0:
            # await websocket.close(code=4000)
            raise HTTPException(status_code=400, detail="Token is required!")
        return token
    except Exception as error:
        logger.error(f"Error validating token: {error}")
        await websocket.close(code=4000)
        raise HTTPException(status_code=400, detail="Invalid token!")
