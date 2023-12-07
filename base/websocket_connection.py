import json
import asyncio
from collections import defaultdict
from typing import Dict, Optional, Any, AsyncGenerator
from asyncio import Queue
from uuid import uuid4
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

from fastapi import WebSocket

from base.database import get_session, get_session_context
from utils.logger import logger
from db_models import *
from crud import update_instances, pull_instances, save_instances, disconnect_local


class LocalTask(str, Enum):
    RUN_PROMPT_MODEL = "RUN_PROMPT_MODEL"
    RUN_CHAT_MODEL = "RUN_CHAT_MODEL"

    LIST_CODE_CHAT_MODELS = "LIST_CHAT_MODELS"
    LIST_CODE_PROMPT_MODELS = "LIST_PROMPT_MODELS"
    LIST_CODE_FUNCTIONS = "LIST_FUNCTIONS"


class ServerTask(str, Enum):
    UPDATE_RESULT_RUN = "UPDATE_RESULT_RUN"
    UPDATE_RESULT_CHAT_RUN = "UPDATE_RESULT_CHAT_RUN"

    SYNC_CODE = "SYNC_CODE"


class ConnectionManager:
    def __init__(self):
        # Store for the active local  connections
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
        await self._set_local_online_status(token, True)
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

                if correlation_id and correlation_id in self.pending_requests:
                    await self.responses[correlation_id].put(data)
                    if not self.pending_requests[correlation_id].is_set():
                        self.pending_requests[
                            correlation_id
                        ].set()  # Signal the event that the response has arrived
                else:
                    await self.task_handler(token, data)
                    # await self.agent_queues[token].put(data)
            except Exception as error:
                logger.error(f"Error reading from websocket for token {token}: {error}")
                break
        # Cleanup when the reader ends (because the websocket closed or there was an error)
        await self.disconnect(token)

    async def disconnect(self, token: str):
        if token in self.connected_locals:
            del self.connected_locals[token]
        # if token in self.agent_queues:
        #     del self.agent_queues[token]
        await self._set_local_online_status(token, False)

    async def _set_local_online_status(self, token: str, online: bool):
        """Update agent's online status in the Supabase database."""
        try:
            if not online:
                await disconnect_local(token=token)
            else:
                async with get_session_context() as session:
                    await session.execute(
                        update(Project)
                        .where(Project.cli_access_key == token)
                        .values(online=True)
                    )
                    await session.commit()
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
            raise ValueError(f"No active local connection found for token {token}")

    async def request(self, token: str, type: LocalTask, message: Dict = {}):
        """
        Send a message to the local connected server and wait for a response.

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
            raise ValueError(f"No active local connection found for token {token}")

    async def stream(
        self, token: str, task_type: LocalTask, message: Dict = {}
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Send a message to the local server and wait for a stream generator.

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
                    if response["status"] in ["completed", "failed"]:
                        stream_end = True
                    if response["status"] == "failed":
                        logger.error(response["log"])
                    yield response
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
            raise ValueError(
                f"No active local connection server found for token {token}"
            )

    async def task_handler(self, token: str, data: dict):
        """Handles the message received from the agent."""
        if data["type"] == ServerTask.SYNC_CODE:
            try:
                async with get_session_context() as session:
                    project = (
                        (
                            await session.execute(
                                select(Project).where(Project.cli_access_key == token)
                            )
                        )
                        .scalars()
                        .all()
                    )

                    if len(project) == 0:
                        logger.error(f"Dev branch not found for token {token}")
                        return

                    project_uuid = project[0].model_dump()["uuid"]
                    changelogs = []
                    instances_in_db = await pull_instances(
                        session=session, project_uuid=project_uuid
                    )

                    prompt_models_in_db = (
                        instances_in_db["prompt_model_data"]
                        if instances_in_db["prompt_model_data"]
                        else []
                    )
                    chat_models_in_db = (
                        instances_in_db["chat_model_data"]
                        if instances_in_db["chat_model_data"]
                        else []
                    )
                    samples_in_db = (
                        instances_in_db["sample_input_data"]
                        if instances_in_db["sample_input_data"]
                        else []
                    )
                    schemas_in_db = (
                        instances_in_db["function_schema_data"]
                        if instances_in_db["function_schema_data"]
                        else []
                    )

                    prompt_models_to_add = []
                    chat_models_to_add = []
                    samples_to_add = []
                    schemas_to_add = []

                    new_prompt_model_name_list = data["new_prompt_model"]
                    new_chat_model_name_list = data["new_chat_model"]
                    new_samples = data["new_samples"]
                    new_function_schemas = data["new_schemas"]

                    old_names = [x["name"] for x in prompt_models_in_db]
                    new_names = list(set(new_prompt_model_name_list) - set(old_names))
                    prompt_models_to_add = [
                        {"name": x, "project_uuid": project_uuid} for x in new_names
                    ]

                    old_names = [x["name"] for x in chat_models_in_db]
                    new_names = list(set(new_chat_model_name_list) - set(old_names))
                    chat_models_to_add = [
                        {"name": x, "project_uuid": project_uuid} for x in new_names
                    ]

                    old_names = [x["name"] for x in samples_in_db]
                    names_in_code = [x["name"] for x in new_samples]
                    new_names = list(set(names_in_code) - set(old_names))
                    samples_to_add = [
                        {
                            "name": x["name"],
                            "content": x["content"],
                            "project_uuid": project_uuid,
                        }
                        for x in new_samples
                        if x["name"] in new_names
                    ]

                    # sample to update
                    samples_to_update = [
                        sample
                        for sample in new_samples
                        if sample["name"] not in new_names
                        and sample["content"]
                        != samples_in_db[old_names.index(sample["name"])]["content"]
                    ]

                    # For FunctionSchema
                    old_names = [x["name"] for x in schemas_in_db]
                    names_in_code = [x["name"] for x in new_function_schemas]
                    new_names = list(set(names_in_code) - set(old_names))
                    schemas_to_add = [
                        {
                            "name": x["name"],
                            "description": x["description"],
                            "parameters": x["parameters"],
                            "mock_response": x["mock_response"]
                            if "mock_response" in x
                            else None,
                            "project_uuid": project_uuid,
                        }
                        for x in new_function_schemas
                        if x["name"] in new_names
                    ]

                    # update schemas
                    schemas_to_update = [
                        schema
                        for schema in new_function_schemas
                        if schema["name"] not in new_names
                    ]

                    # save instances
                    new_instances = await save_instances(
                        session=session,
                        prompt_models=prompt_models_to_add,
                        chat_models=chat_models_to_add,
                        sample_inputs=samples_to_add,
                        function_schemas=schemas_to_add,
                    )

                    created_prompt_models = (
                        new_instances["prompt_model_rows"]
                        if new_instances["prompt_model_rows"]
                        else []
                    )
                    created_chat_models = (
                        new_instances["chat_model_rows"]
                        if new_instances["chat_model_rows"]
                        else []
                    )
                    created_samples = (
                        new_instances["sample_input_rows"]
                        if new_instances["sample_input_rows"]
                        else []
                    )
                    created_schemas = (
                        new_instances["function_schema_rows"]
                        if new_instances["function_schema_rows"]
                        else []
                    )

                    prompt_model_name_list_to_update = new_prompt_model_name_list
                    chat_model_name_list_to_update = new_chat_model_name_list
                    # update instances
                    updated_instances = await update_instances(
                        session=session,
                        project_uuid=project_uuid,
                        prompt_model_names=prompt_model_name_list_to_update,
                        chat_model_names=chat_model_name_list_to_update,
                        sample_input_names=[x["name"] for x in new_samples],
                        function_schema_names=[x["name"] for x in new_function_schemas],
                        sample_inputs=samples_to_update,
                        function_schemas=schemas_to_update,
                    )

                    updated_samples = (
                        updated_instances["sample_input_rows"]
                        if updated_instances["sample_input_rows"]
                        else []
                    )
                    updated_schemas = (
                        updated_instances["function_schema_rows"]
                        if updated_instances["function_schema_rows"]
                        else []
                    )

                    # make changelog
                    changelogs = [
                        {
                            "subject": f"prompt_model",
                            "identifiers": [
                                str(x["uuid"]) for x in created_prompt_models
                            ],
                            "action": "ADD",
                        },
                        {
                            "subject": f"chat_model",
                            "identifiers": [
                                str(x["uuid"]) for x in created_chat_models
                            ],
                            "action": "ADD",
                        },
                        {
                            "subject": f"sample_input",
                            "identifiers": [str(x["uuid"]) for x in created_samples],
                            "action": "ADD",
                        },
                        {
                            "subject": f"function_schema",
                            "identifiers": [str(x["uuid"]) for x in created_schemas],
                            "action": "ADD",
                        },
                        {
                            "subject": f"sample_input",
                            "identifiers": [str(x["uuid"]) for x in updated_samples],
                            "action": "UPDATE",
                        },
                        {
                            "subject": f"function_schema",
                            "identifiers": [str(x["uuid"]) for x in updated_schemas],
                            "action": "UPDATE",
                        },
                    ]
                    # delete if len(identifiers) == 0
                    changelogs = [x for x in changelogs if len(x["identifiers"]) > 0]
                    # save changelog
                    if len(changelogs) > 0:
                        session.add(
                            ProjectChangelog(
                                **{
                                    "logs": changelogs,
                                    "project_uuid": str(project_uuid),
                                }
                            )
                        )
                        await session.commit()

                    ws = self.connected_locals.get(token)
                    response_data = {
                        "type": "SYNC_CODE",
                        "status": "completed",
                        "correlation_id": data["correlation_id"],
                    }
                    await ws.send_text(json.dumps(response_data))
                    logger.info(
                        f"Send response message to local for SYNC_CODE : {response_data}"
                    )

            except Exception as error:
                logger.error(f"Error in Syncing with code: {error}")


websocket_manager = ConnectionManager()
