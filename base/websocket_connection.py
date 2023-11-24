import json
import asyncio
from collections import defaultdict
from typing import Dict, Optional, Any, AsyncGenerator
from asyncio import Queue
from uuid import uuid4
from datetime import datetime, timezone
from enum import Enum

from fastapi import WebSocket

from base.database import supabase
from utils.logger import logger


class LocalTask(str, Enum):
    RUN_PROMPT_MODEL = "RUN_PROMPT_MODEL"
    RUN_CHAT_MODEL = "RUN_CHAT_MODEL"

    LIST_CODE_CHAT_MODELS = "LIST_CHAT_MODELS"
    LIST_CODE_PROMPT_MODELS = "LIST_PROMPT_MODELS"
    LIST_CODE_FUNCTIONS = "LIST_FUNCTIONS"


class ServerTask(str, Enum):
    UPDATE_RESULT_RUN = "UPDATE_RESULT_RUN"
    UPDATE_RESULT_CHAT_RUN = "UPDATE_RESULT_CHAT_RUN"
    LOCAL_UPDATE_ALERT = "LOCAL_UPDATE_ALERT"

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
            if not online:
                res = (
                    supabase.table("project")
                    .update({"cli_access_key": None, "online": False})
                    .eq("cli_access_key", token)
                    .execute()
                    .data
                )
                project_uuid = res[0]["uuid"]
                (
                    supabase.table("prompt_model")
                    .update({"online": False})
                    .eq("project_uuid", project_uuid)
                    .execute()
                )
                (
                    supabase.table("chat_model")
                    .update({"online": False})
                    .eq("project_uuid", project_uuid)
                    .execute()
                )
                (
                    supabase.table("sample_input")
                    .update({"online": False})
                    .eq("project_uuid", project_uuid)
                    .execute()
                )
                (
                    supabase.table("function_schema")
                    .update({"online": False})
                    .eq("project_uuid", project_uuid)
                    .execute()
                )
            else:
                res = (
                    supabase.table("project")
                    .update({"online": True})
                    .eq("cli_access_key", token)
                    .execute()
                    .data
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
                    # print(response)
                    # if "parsed_outputs" in response:
                    #     print("type of parsed outputs", type(response["parsed_outputs"]))
                    #     print(json.dumps(response))
                    #     print(type(json.dumps(response)))
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
        # UPDATE_PROMPT_MODEL = "UPDATE_PROMPT_MODEL"
        # UPDATE_CHAT_MODEL = "UPDATE_CHAT_MODEL"
        # UPDATE_SAMPLES = "UPDATE_SAMPLES"
        # UPDATE_FUNCTIONS = "UPDATE_FUNCTIONS"
        if data["type"] == ServerTask.LOCAL_UPDATE_ALERT:
            try:
                project = (
                    supabase.table("project")
                    .update({"sync": False})
                    .eq("cli_access_key", token)
                    .execute()
                ).data

                if len(project) == 0:
                    logger.error(f"Dev branch not found for token {token}")
                    return

                project_name = project[0]["name"]
                logger.info(f"Project {project_name} sync columm updated to False")

            except Exception as error:
                logger.error(f"Error updating Dev branch sync columm: {error}")

        elif data["type"] == ServerTask.SYNC_CODE:
            try:
                project = (
                    supabase.table("project")
                    .update({"sync": False})
                    .eq("cli_access_key", token)
                    .execute()
                ).data

                if len(project) == 0:
                    logger.error(f"Dev branch not found for token {token}")
                    return

                project_uuid = project[0]["uuid"]
                changelogs = []

                new_prompt_model_name_list = data["new_prompt_model"]
                new_chat_model_name_list = data["new_chat_model"]
                new_samples = data["new_samples"]
                new_function_schemas = data["new_schemas"]

                prompt_models_in_db = (
                    supabase.table("prompt_model")
                    .select("uuid, name")
                    .eq("project_uuid", project_uuid)
                    .execute()
                    .data
                )
                old_names = [x["name"] for x in prompt_models_in_db]
                new_names = list(set(new_prompt_model_name_list) - set(old_names))
                new_prompt_models = [
                    {"name": x, "project_uuid": project_uuid} for x in new_names
                ]
                # insert new prompt_models
                if len(new_prompt_models) > 0:
                    new_versions = (
                        supabase.table("prompt_model")
                        .insert(new_prompt_models)
                        .execute()
                        .data
                    )
                    changelogs.append(
                        {
                            "subject": f"prompt_model",
                            "identifiers": [
                                version["uuid"] for version in new_versions
                            ],
                            "action": "ADD",
                        }
                    )
                supabase.table("prompt_model").update({"online": False}).eq(
                    "project_uuid", project_uuid
                ).execute()
                if len(new_prompt_model_name_list) > 0:
                    supabase.table("prompt_model").update({"online": True}).eq(
                        "project_uuid", project_uuid
                    ).in_("name", new_prompt_model_name_list).execute()

                # for ChatModel
                chat_models_in_db = (
                    supabase.table("chat_model")
                    .select("uuid, name")
                    .eq("project_uuid", project_uuid)
                    .execute()
                    .data
                )
                old_names = [x["name"] for x in chat_models_in_db]
                new_names = list(set(new_chat_model_name_list) - set(old_names))
                new_chat_models = [
                    {"name": x, "project_uuid": project_uuid} for x in new_names
                ]
                # insert new chat_models
                if len(new_chat_models) > 0:
                    new_versions = (
                        supabase.table("chat_model")
                        .insert(new_chat_models)
                        .execute()
                        .data
                    )
                    changelogs.append(
                        {
                            "subject": f"chat_model",
                            "identifiers": [
                                version["uuid"] for version in new_versions
                            ],
                            "action": "ADD",
                        }
                    )
                supabase.table("chat_model").update({"online": False}).eq(
                    "project_uuid", project_uuid
                ).execute()
                if len(new_chat_model_name_list) > 0:
                    supabase.table("chat_model").update({"online": True}).eq(
                        "project_uuid", project_uuid
                    ).in_("name", new_chat_model_name_list).execute()

                # For Sample
                samples_in_db = (
                    supabase.table("sample_input")
                    .select("*")
                    .eq("project_uuid", project_uuid)
                    .execute()
                    .data
                )
                old_names = [x["name"] for x in samples_in_db]
                names_in_code = [x["name"] for x in new_samples]
                new_names = list(set(names_in_code) - set(old_names))
                new_samples = [
                    {
                        "name": x["name"],
                        "content": x["content"],
                        "project_uuid": project_uuid,
                    }
                    for x in new_samples
                    if x["name"] in new_names
                ]
                # insert new samples
                if len(new_samples) > 0:
                    new_samples = (
                        supabase.table("sample_input")
                        .insert(new_samples)
                        .execute()
                        .data
                    )
                    changelogs.append(
                        {
                            "subject": f"sample_input",
                            "identifiers": [sample["uuid"] for sample in new_samples],
                            "action": "ADD",
                        }
                    )

                # sample to update
                samples_to_update = [
                    sample
                    for sample in new_samples
                    if sample["name"] not in new_names
                    and sample["content"]
                    != samples_in_db[old_names.index(sample["name"])]["content"]
                ]
                if len(samples_to_update) > 0:
                    update_sample_uuids = []
                    for sample in samples_to_update:
                        res = (
                            supabase.table("sample_input")
                            .update({"content": sample["content"]})
                            .eq("project_uuid", project_uuid)
                            .eq("name", sample["name"])
                            .execute()
                            .data
                        )
                        update_sample_uuids.append(res[0]["uuid"])
                    changelogs.append(
                        {
                            "subject": f"sample_input",
                            "identifiers": update_sample_uuids,
                            "action": "UPDATE",
                        }
                    )
                supabase.table("sample_input").update({"online": False}).eq(
                    "project_uuid", project_uuid
                ).execute()
                if len(new_samples) > 0:
                    supabase.table("sample_input").update({"online": True}).eq(
                        "project_uuid", project_uuid
                    ).in_("name", names_in_code).execute()

                # For FunctionSchema
                schemas_in_db = (
                    supabase.table("function_schema")
                    .select("*")
                    .eq("project_uuid", project_uuid)
                    .execute()
                    .data
                )
                old_names = [x["name"] for x in schemas_in_db]
                names_in_code = [x["name"] for x in new_function_schemas]
                new_names = list(set(names_in_code) - set(old_names))
                new_schemas = [
                    {
                        "name": x["name"],
                        "description": x["description"],
                        "parameter": x["parameter"],
                        "mock_response": x["mock_response"]
                        if "mock_response" in x
                        else None,
                        "project_uuid": project_uuid,
                    }
                    for x in new_function_schemas
                    if x["name"] in new_names
                ]
                # insert new schemas
                if len(new_schemas) > 0:
                    res = (
                        supabase.table("function_schema")
                        .insert(new_schemas)
                        .execute()
                        .data
                    )
                    changelogs.append(
                        {
                            "subject": f"function_schema",
                            "identifiers": [schema["uuid"] for schema in res],
                            "action": "ADD",
                        }
                    )

                # update schemas
                schema_to_update = [
                    schema
                    for schema in new_function_schemas
                    if schema["name"] not in new_names
                ]
                if len(schema_to_update) > 0:
                    update_schema_uuids = []
                    for schema in schema_to_update:
                        res = (
                            supabase.table("function_schema")
                            .update(
                                {
                                    "description": schema["description"],
                                    "parameter": schema["parameter"],
                                    "mock_response": schema["mock_response"],
                                }
                            )
                            .eq("project_uuid", project_uuid)
                            .eq("name", schema["name"])
                            .execute()
                            .data
                        )
                        update_schema_uuids.append(res[0]["uuid"])
                    changelogs.append(
                        {
                            "subject": f"function_schema",
                            "identifiers": update_schema_uuids,
                            "action": "UPDATE",
                        }
                    )

                supabase.table("function_schema").update({"online": False}).eq(
                    "project_uuid", project_uuid
                ).execute()
                if len(new_function_schemas) > 0:
                    supabase.table("function_schema").update({"online": True}).eq(
                        "project_uuid", project_uuid
                    ).in_("name", names_in_code).execute()

                # save changelog
                if len(changelogs) > 0:
                    (
                        supabase.table("project_changelog")
                        .insert(
                            {
                                "logs": changelogs,
                                "project_uuid": project_uuid,
                            }
                        )
                        .execute()
                    )

            except Exception as error:
                logger.error(f"Error in Syncing with code: {error}")


websocket_manager = ConnectionManager()
