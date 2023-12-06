from fastapi import WebSocket, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from starlette.status import HTTP_403_FORBIDDEN, HTTP_500_INTERNAL_SERVER_ERROR

# from base.database import supabase
from utils.logger import logger
from utils.security import get_project

API_KEY_HEADER = "Authorization"
api_key_header = APIKeyHeader(name=API_KEY_HEADER, auto_error=False)

# # TODO: Fix below
# async def get_token(authorization: str = Depends(api_key_header)):
#     if not authorization:
#         raise HTTPException(status_code=400, detail="Authorization header is required!")
#     auth_header = authorization.split(" ")
#     if len(auth_header) != 2:
#         raise HTTPException(status_code=400, detail="Invalid authorization header!")
#     token = auth_header[1]
#     try:
#         agent = (
#             supabase.table("agent").select("id, name").eq("api_token", token).execute()
#         ).data
#         logger.debug(f"Agent authorized: {agent}")
#         if not agent:  # You can further validate the token here if necessary
#             raise HTTPException(status_code=400, detail="Token is required!")
#         return token
#     except Exception as error:
#         logger.error(f"Error validating token: {error}")
#         raise HTTPException(status_code=400, detail="Invalid token!")


async def get_user_id(authorization: str = Depends(api_key_header)):
    if not authorization:
        raise HTTPException(status_code=400, detail="Authorization header is required!")
    auth_header = authorization.split(" ")
    if len(auth_header) != 2:
        raise HTTPException(status_code=400, detail="Invalid authorization header!")
    user_id = auth_header[1]
    try:
        user = (
            supabase.table("user")
            .select("user_id")
            .eq("user_id", user_id)
            .single()
            .execute()
        ).data
        logger.debug(f"User authorized: {user}")
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
        project = (
            supabase.table("project")
            .select("id, name")
            .eq("cli_access_key", token)
            .execute()
            .data
        )
        if not project:
            # await websocket.close(code=4000)
            raise HTTPException(status_code=400, detail="Token is required!")
        return token
    except Exception as error:
        logger.error(f"Error validating token: {error}")
        await websocket.close(code=4000)
        raise HTTPException(status_code=400, detail="Invalid token!")
