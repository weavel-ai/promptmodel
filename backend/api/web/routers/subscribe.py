import os
import json
from typing import Any, Dict, Optional
from uuid import uuid4
from fastapi.responses import JSONResponse
from redis import asyncio as aioredis
import asyncio
import logging
from dotenv import load_dotenv
from fastapi import WebSocket, APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)

load_dotenv()

redis_host = os.environ.get("REDIS_HOST", "localhost")
redis_port = os.environ.get("REDIS_PORT", 6379)
try:
    redis_port = int(redis_port)
except ValueError:
    redis_port = 6379
redis_password = os.environ.get("REDIS_PASSWORD", None)
redis = aioredis.Redis(host=redis_host, port=redis_port, db=0, password=redis_password)

async def redis_listener(websocket: WebSocket, table_name: str, project_uuid: Optional[str] = None, organization_id: Optional[str] = None):
    print("Starting redis listener")
    pubsub = redis.pubsub()
    channel = f"{table_name}_channel"
    if project_uuid:
        channel += f"_p_{project_uuid}"
    if organization_id:
        channel += f"_o_{organization_id}"
    print(f"channel: {channel}")
    await pubsub.subscribe(channel)
    print(f"Subscribed to {channel}")
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                # Decode the bytes data to string and then load it as JSON
                data_str = message["data"].decode("utf-8")
                data_json: Dict[str, Any] = json.loads(data_str)
                await websocket.send_json(data_json)
            await asyncio.sleep(5)  # Prevents the loop from running too fast
    except Exception as exception:
        print(exception)
        await pubsub.unsubscribe(channel)


@router.websocket("/{table_name}")
async def subscribe(websocket: WebSocket, token: str, table_name: str, project_uuid: Optional[str] = None, organization_id: Optional[str] = None):
    # Check if token is valid
    if not redis.exists(token):
        await websocket.close(code=1008, reason="Invalid or expired token")
        return
    
    await websocket.accept()
    await redis_listener(websocket=websocket, table_name=table_name, project_uuid=project_uuid, organization_id=organization_id)


@router.post("/start")
async def start_subscription():
    # TODO: add authentication
    # Generate a unique token
    token = str(uuid4())
    # Store the token in Redis with an expiration time of 60 seconds
    await redis.setex(token, 60, 'valid')

    return JSONResponse(content={"token": token})
