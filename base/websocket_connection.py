import json
import asyncio
from collections import defaultdict
from typing import Dict, Optional, Any
from asyncio import Queue
from uuid import uuid4
from datetime import datetime, timezone
from enum import Enum

from fastapi import WebSocket

from base.database import supabase
from utils.logger import logger

class LocalTask(str, Enum):
    RUN_LLM_MODULE = "RUN_LLM_MODULE"
    EVAL_LLM_MODULE = "EVAL_LLM_MODULE"
    LIST_MODULES = "LIST_MODULES"
    LIST_VERSIONS = "LIST_VERSIONS"
    LIST_SAMPLES = "LIST_SAMPLES"
    GET_PROMPTS = "GET_PROMPTS"
    GET_RUN_LOGS = "GET_RUN_LOGS"
    CHANGE_VERSION_STATUS = "CHANGE_VERSION_STATUS"
    GET_VERSION_TO_SAVE = "GET_VERSION_TO_SAVE"
    GET_VERSIONS_TO_SAVE = "GET_VERSIONS_TO_SAVE"
    UPDATE_CANDIDATE_VERSION_ID = "UPDATE_CANDIDATE_VERSION_ID"

class ServerTask(str, Enum):
    UPDATE_RESULT_RUN = "UPDATE_RESULT_RUN"
    LOCAL_UPDATE_ALERT = "LOCAL_UPDATE_ALERT"
    UPDATE_RESULT_EVAL = "UPDATE_RESULT_EVAL"

class ConnectionManager:
    def __init__(self):
        # Store for the active local dev server connections
        self.connected_locals: Dict[str, WebSocket] = {}
        # Store for the local server's messages (this maps tokens to asyncio Queues)
        # self.local_queues: Dict[str, Queue] = {}
        # Store for the local server's running services. Maps runner IDs to service_log IDs & user_ids.
        self.running_services: Dict[str, Dict[str, Any]] = {}
        # Store for the pending requests. Maps correlation IDs to asyncio Events.
        self.pending_requests: Dict[str, asyncio.Event] = {}
        # Store for the responses. Maps correlation IDs to message content.
        self.responses: Dict[str, Queue] = defaultdict(Queue)

    async def connect(self, websocket: WebSocket, token: str):
        """Accept a websocket connection from a local server."""
        await websocket.accept()
        self.connected_locals[token] = websocket
        # Create and store a new queue for this local server
        # self.local_queues[token] = asyncio.Queue()
        self._set_local_online_status(token, True)
        # Start a dedicated reader task for this local server
        task = asyncio.create_task(self.websocket_reader(websocket, token))
        return task
    async def websocket_reader(self, websocket: WebSocket, token: str):
        """Read messages from the websocket and put them in the appropriate queue/cache."""
        while True:
            try:
                message = await websocket.receive_text()
                data = json.loads(message)
                logger.debug(f"Received data : {data}")
                correlation_id = data.get("correlation_id")
                # print("Received", data)

                if correlation_id and correlation_id in self.pending_requests:
                    await self.responses[correlation_id].put(data)
                    if not self.pending_requests[correlation_id].is_set():
                        self.pending_requests[correlation_id].set()  # Signal the event that the response has arrived
                else:
                    await self.task_handler(token, data)
                    # await self.agent_queues[token].put(data)
            except Exception as error:
                logger.error(f"Error reading from websocket for token {token}: {error}")
                break
        # Cleanup when the reader ends (because the websocket closed or there was an error)
        self.disconnect(token)
        self._set_local_online_status(token, False)

    def disconnect(self, token: str):
        if token in self.connected_locals:
            del self.connected_locals[token]
        # if token in self.agent_queues:
        #     del self.agent_queues[token]
        self._set_local_online_status(token, False)

    def _set_local_online_status(self, token: str, online: bool):
        """Update agent's online status in the Supabase database."""
        try:
            (
                supabase.table("dev_branch")
                .update({"online": online})
                .eq("cli_access_key", token)
                .execute()
            )
        except Exception as error:
            logger.error(f"Error updating online status for token {token}: {error}")
            
    async def send_message(
        self,
        token: str,
        type: LocalTask,
        message: Dict = {},
    ):
        """Send a message to the local."""
        ws = self.connected_locals.get(token)
        if ws:
            try:
                message["type"] = type.value
                await ws.send_text(json.dumps(message))
                logger.success(
                    f"""Sent message to local.
  - Token: {token}
  - Message: {message}"""
                )
            except Exception as error:
                logger.error(
                    f"""Error sending message to local: {error}
  - Token: {token}
  - Message: {message}"""
                )
        else:
            raise ValueError(f"No active local dev server found for token {token}")

    async def request(self, token: str, type: LocalTask, message: Dict = {}):
        """
        Send a message to the local dev server and wait for a response.

        Returns a python object.
        """
        ws = self.connected_locals.get(token)
        if ws:
            correlation_id = str(uuid4())  # Generate unique correlation ID
            message["correlation_id"] = correlation_id

            try:
                message["type"] = type.value
                await ws.send_text(json.dumps(message))
                logger.success(
                    f"""Sent request to local.
    - Token: {token}
    - Message: {message}"""
                )
                event = asyncio.Event()
                self.pending_requests[correlation_id] = event

                await asyncio.wait_for(event.wait(), timeout=120)  # 2 minutes timeout
                response = await self.responses[correlation_id].get()
                return response
            except Exception as error:
                logger.error(
                    f"""Error for request to local: {error}
    - Token: {token}
    - Message: {message}"""
                )
            finally:
                self.pending_requests.pop(correlation_id, None)
                self.responses.pop(correlation_id, None)
        else:
            raise ValueError(f"No active local dev server found for token {token}")
        
    async def stream(self, token: str, task_type: LocalTask, message: Dict = {}):
        """
        Send a message to the local dev server and wait for a stream generator.

        Stream Dict[str, Any] until done.
        """
        logger.debug("start stream")
        ws = self.connected_locals.get(token)
        if ws:
            correlation_id = str(uuid4())  # Generate unique correlation ID
            message["correlation_id"] = correlation_id

            try:
                message["type"] = task_type.value
                await ws.send_text(json.dumps(message))
                logger.success(
                    f"""Sent stream request to local.
    - Token: {token}
    - Message: {message}"""
                )
                # stream response from local
                event = asyncio.Event()
                self.pending_requests[correlation_id] = event
                stream_end = False
                await asyncio.wait_for(event.wait(), timeout=60)
                while not stream_end: 
                    response = await self.responses[correlation_id].get()
                    # print(response)
                    # if "parsed_outputs" in response:
                    #     print("type of parsed outputs", type(response["parsed_outputs"]))
                    #     print(json.dumps(response))
                    #     print(type(json.dumps(response)))
                    if response['status'] in ['completed', 'failed']:
                        stream_end = True
                    if response['status'] == 'failed':
                        logger.error(response['log'])
                    yield json.dumps(response)
            except Exception as error:
                logger.error(
                    f"""Error for stream request to local: {error}
    - Token: {token}
    - Message: {message}"""
                )
            finally:
                self.pending_requests.pop(correlation_id, None)
                self.responses.pop(correlation_id, None)
        else:
            raise ValueError(f"No active local dev server found for token {token}")
    
    async def task_handler(self, token: str, data: dict):
        """Handles the message received from the agent."""
        if data["type"] == ServerTask.LOCAL_UPDATE_ALERT:
            try:
                dev_branch = (
                    supabase.table("dev_branch")
                    .update({"sync": False})
                    .eq("cli_access_key", token)
                    .execute()
                ).data
                
                if len(dev_branch) == 0:
                    logger.error(f"Dev branch not found for token {token}")
                    return
                
                dev_branch_id = dev_branch[0]["id"]
                logger.info(f"Dev branch {dev_branch_id} sync columm updated to False")

            except Exception as error:
                logger.error(f"Error updating Dev branch sync columm: {error}")

websocket_manager = ConnectionManager()