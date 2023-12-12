from redis import asyncio as aioredis
import asyncio

from fastapi import WebSocket, APIRouter

router = APIRouter()


async def redis_listener(websocket: WebSocket, table_name: str):
    redis = aioredis.from_url("redis://localhost")
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"{table_name}_channel")

    while True:
        message = await pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            print(message)
            await websocket.send_json(message["data"])
        await asyncio.sleep(5)  # Prevents the loop from running too fast


@router.websocket("/{table_name}")
async def subscribe(websocket: WebSocket, table_name: str):
    await websocket.accept()
    await redis_listener(websocket, table_name)
