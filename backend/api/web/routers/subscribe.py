import os
import json
from typing import Any, Dict, Optional
from redis import asyncio as aioredis
import asyncio
import logging
from dotenv import load_dotenv
from fastapi import WebSocket, APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)

load_dotenv()

redis_host = os.environ.get("REDIS_HOST", "localhost")
redis_port = int(os.environ.get("REDIS_PORT", 6379))

async def redis_listener(websocket: WebSocket, table_name: str, project_uuid: Optional[str] = None, organization_id: Optional[str] = None):
    print("Starting redis listener")
    redis = aioredis.Redis(host=redis_host, port=redis_port, db=0)
    # redis = aioredis.Redis(host="redis", port=6379, db=0)
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
async def subscribe(websocket: WebSocket, table_name: str, project_uuid: Optional[str] = None, organization_id: Optional[str] = None):
    await websocket.accept()
    await redis_listener(websocket=websocket, table_name=table_name, project_uuid=project_uuid, organization_id=organization_id)
