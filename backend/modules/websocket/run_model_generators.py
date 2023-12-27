import re
import json
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update

from utils.logger import logger
from utils.prompt_utils import update_dict
from modules.types import (
    LocalTaskErrorType,
)
from base.database import get_session
from base.websocket_connection import websocket_manager, LocalTask
from api.common.models import (
    ChatModelRunConfig,
    PromptConfig,
    FunctionModelRunConfig,
)
from db_models import *


async def run_local_function_model_generator(
    session: AsyncSession,
    project: Dict,
    cli_access_key: str,
    run_config: FunctionModelRunConfig,
):
    # 1. insert inputs to prompts
    sample_input: Dict[str, str] = (
        run_config.sample_input if run_config.sample_input else {}
    )
    prompt_variables = []

    for prompt in run_config.prompts:
        prompt_content: str = prompt.content
        # Replace
        escaped_patterns = re.findall(r"\{\{.*?\}\}", prompt_content)
        for i, pattern in enumerate(escaped_patterns):
            prompt_content = prompt_content.replace(pattern, f"__ESCAPED{i}__")

        # find f-string input variables
        fstring_input_pattern = r"(?<!\\)\{([^}]+)\}(?<!\\})"
        prompt_variables_in_prompt = re.findall(fstring_input_pattern, prompt_content)

        # Replace back
        for i, pattern in enumerate(escaped_patterns):
            prompt_content = prompt_content.replace(f"__ESCAPED{i}__", pattern)

        prompt_variables_in_prompt = list(set(prompt_variables_in_prompt))
        prompt_variables += prompt_variables_in_prompt

    if len(prompt_variables) != 0:
        if sample_input is None:
            data = {
                "status": "failed",
                "log": f"Prompt has variables {prompt_variables}. Sample input is required for variable matching.",
            }
            yield json.dumps(data)
            return

        if not all(variable in sample_input.keys() for variable in prompt_variables):
            missing_variables = [
                variable
                for variable in prompt_variables
                if variable not in sample_input.keys()
            ]

            data = {
                "status": "failed",
                "log": f"Sample input does not have variables {missing_variables} in prompts.",
            }
            yield json.dumps(data)
            return

    model = run_config.model
    prompts = run_config.prompts
    parsing_type = run_config.parsing_type

    if sample_input:
        messages_for_run = [
            {
                "content": prompt.content.format(**sample_input),
                "role": prompt.role,
            }
            for prompt in prompts
        ]
    else:
        messages_for_run = [p.model_dump() for p in prompts]

    # 2. fetch function schemas
    if run_config.functions is None:
        function_schemas = None
    else:
        function_schemas = (
            (
                await session.execute(
                    select(
                        FunctionSchema.name,
                        FunctionSchema.description,
                        FunctionSchema.parameters,
                        FunctionSchema.mock_response,
                    )
                    .where(FunctionSchema.project_uuid == project["uuid"])
                    .where(FunctionSchema.name.in_(run_config.functions))
                )
            )
            .mappings()
            .all()
        )  # function_schemas includes mock_response

    # 3. flush function_model_version
    function_model_version_uuid: Optional[str] = run_config.version_uuid
    need_project_version_update = False
    changelogs = []

    if function_model_version_uuid is None:
        if run_config.from_version is None:
            version = 1
            need_project_version_update = True
        else:
            latest_version = (
                await session.execute(
                    select(FunctionModelVersion.version)
                    .where(
                        FunctionModelVersion.function_model_uuid
                        == run_config.function_model_uuid
                    )
                    .order_by(desc(FunctionModelVersion.version))
                    .limit(1)
                )
            ).scalar_one()

            version = latest_version + 1
        new_function_model_version_row = FunctionModelVersion(
            **{
                "function_model_uuid": run_config.function_model_uuid,
                "from_version": run_config.from_version,
                "version": version,
                "model": run_config.model,
                "parsing_type": run_config.parsing_type,
                "output_keys": run_config.output_keys,
                "functions": run_config.functions,
                "is_published": True if version == 1 else False,
            }
        )
        session.add(new_function_model_version_row)
        await session.flush()
        await session.refresh(new_function_model_version_row)

        changelogs.append(
            {
                "subject": "function_model_version",
                "identifier": [str(new_function_model_version_row.uuid)],
                "action": "ADD",
            }
        )

        if need_project_version_update:
            changelogs.append(
                {
                    "subject": "function_model_version",
                    "identifier": [str(new_function_model_version_row.uuid)],
                    "action": "PUBLISH",
                }
            )

        function_model_version_uuid: str = str(new_function_model_version_row.uuid)
        for prompt in run_config.prompts:
            prompt_row = Prompt(
                **{
                    "version_uuid": function_model_version_uuid,
                    "role": prompt.role,
                    "step": prompt.step,
                    "content": prompt.content,
                }
            )
            session.add(prompt_row)
        await session.flush()

        data = {
            "function_model_version_uuid": function_model_version_uuid,
            "version": version,
            "status": "running",
        }
        yield json.dumps(data)

    websocket_message = {
        "messages_for_run": messages_for_run,
        "model": run_config.model,
        "parsing_type": run_config.parsing_type,
        "function_schemas": function_schemas,
        "output_keys": run_config.output_keys,
    }

    data = {
        "status": "running",
        "inputs": sample_input if sample_input else {},
    }
    yield json.dumps(data)

    res = websocket_manager.stream(
        cli_access_key, LocalTask.RUN_PROMPT_MODEL, websocket_message
    )

    error_type = None
    error_log = None
    output = {"raw_output": "", "parsed_outputs": {}}
    function_call = None
    function_response = None

    async for chunk in res:
        # check output and update DB
        if "raw_output" in chunk:
            if output["raw_output"] is None:
                output["raw_output"] = ""
            output["raw_output"] += chunk["raw_output"]

        if "parsed_outputs" in chunk:
            output["parsed_outputs"] = update_dict(
                output["parsed_outputs"], chunk["parsed_outputs"]
            )

        if "function_call" in chunk:
            function_call: Dict = chunk["function_call"]

        if "function_response" in chunk:
            function_response = chunk["function_response"]["response"]

        if chunk["status"] in ["completed", "failed"]:
            error_type = chunk["error_type"] if "error_type" in chunk else None
            error_log = chunk["log"] if "log" in chunk else None

        yield json.dumps(chunk)

    if function_call:
        function_call["function_response"] = function_response

    new_run_log = RunLog(
        **{
            "project_uuid": project["uuid"],
            "version_uuid": function_model_version_uuid,
            "inputs": sample_input,
            "raw_output": output["raw_output"],
            "parsed_outputs": output["parsed_outputs"],
            "function_call": function_call,
            "run_log_metadata": {
                "error_log": error_log,
                "error": True,
            }
            if error_type
            else None,
            "run_from_deployment": False,
        }
    )

    if error_type and (
        error_type == LocalTaskErrorType.NO_FUNCTION_NAMED_ERROR.value
        or error_type == LocalTaskErrorType.SERVICE_ERROR.value
    ):
        return

    session.add(new_run_log)
    await session.flush()

    if need_project_version_update:
        await session.execute(
            update(Project)
            .where(Project.uuid == project["uuid"])
            .values(version=project["version"] + 1)
        )
        await session.flush()

    if len(changelogs) > 0:
        session.add(ProjectChangelog(project_uuid=project["uuid"], logs=changelogs))
        await session.flush()

    await session.commit()


async def run_local_chat_model_generator(
    session: AsyncSession,
    project: Dict,
    start_timestampz_iso,
    cli_access_key: str,
    run_config: ChatModelRunConfig,
):
    changelogs = []
    need_project_version_update = False

    chat_model_version_config = {
        "chat_model_uuid": run_config.chat_model_uuid,
        "model": run_config.model,
        "from_version": run_config.from_version,
        "uuid": run_config.version_uuid,
        "functions": run_config.functions,
        "system_prompt": run_config.system_prompt,
    }
    session_uuid = run_config.session_uuid

    old_messages = [{"role": "system", "content": run_config.system_prompt}]
    if session_uuid:
        chat_messages: List[Dict] = (
            (
                await session.execute(
                    select(
                        ChatMessage.role,
                        ChatMessage.name,
                        ChatMessage.content,
                        ChatMessage.tool_calls,
                        ChatMessage.function_call,
                    )
                    .where(ChatMessage.session_uuid == session_uuid)
                    .order_by(asc(ChatMessage.created_at))
                )
            )
            .mappings()
            .all()
        )
        old_messages += chat_messages
        # delete None values
        old_messages = [
            {k: v for k, v in message.items() if v is not None}
            for message in old_messages
        ]

    # add function schemas
    function_schemas = (
        (
            await session.execute(
                select(
                    FunctionSchema.name,
                    FunctionSchema.description,
                    FunctionSchema.parameters,
                    FunctionSchema.mock_response,
                )
                .where(FunctionSchema.project_uuid == project["uuid"])
                .where(FunctionSchema.name.in_(run_config.functions))
            )
        )
        .mappings()
        .all()
    )

    user_input = run_config.user_input

    if chat_model_version_config["uuid"] is None:
        del chat_model_version_config["uuid"]
        # find latest version
        if run_config.from_version is None:
            chat_model_version_config["is_published"] = True
            chat_model_version_config["version"] = 1
            new_chat_model_version_row = ChatModelVersion(**chat_model_version_config)
            session.add(new_chat_model_version_row)
            await session.flush()
            await session.refresh(new_chat_model_version_row)
            # update project version
            need_project_version_update = True
            changelogs += [
                {
                    "subject": "chat_model_version",
                    "identifier": [str(new_chat_model_version_row.uuid)],
                    "action": "ADD",
                },
                {
                    "subject": "chat_model_version",
                    "identifier": [str(new_chat_model_version_row.uuid)],
                    "action": "PUBLISH",
                },
            ]
        else:
            latest_version = (
                await session.execute(
                    select(ChatModelVersion.version)
                    .where(
                        ChatModelVersion.chat_model_uuid == run_config.chat_model_uuid
                    )
                    .order_by(desc(ChatModelVersion.version))
                    .limit(1)
                )
            ).scalar_one()

            chat_model_version_config["version"] = latest_version + 1
            new_chat_model_version_row = ChatModelVersion(**chat_model_version_config)

            session.add(new_chat_model_version_row)
            await session.flush()
            await session.refresh(new_chat_model_version_row)

            changelogs.append(
                {
                    "subject": "chat_model_version",
                    "identifier": [str(new_chat_model_version_row.uuid)],
                    "action": "ADD",
                }
            )

        chat_model_version_config["uuid"] = str(new_chat_model_version_row.uuid)

        data = {
            "chat_model_version_uuid": chat_model_version_config["uuid"],
            "version": chat_model_version_config["version"],
            "status": "running",
        }
        yield json.dumps(data)

    # make session
    if session_uuid is None:
        new_session = ChatSession(
            **{
                "version_uuid": chat_model_version_config["uuid"],
                "run_from_deployment": False,
            }
        )
        session.add(new_session)
        await session.flush()
        await session.refresh(new_session)

        session_uuid: str = str(new_session.uuid)

        data = {
            "chat_session_uuid": session_uuid,
            "status": "running",
        }
        yield json.dumps(data)

    new_messages = [
        {
            "role": "user",
            "content": user_input,
            "created_at": start_timestampz_iso,
            "session_uuid": session_uuid,
        }
    ]

    response_messages = []
    current_message = {
        "role": "assistant",
        "content": "",
        "function_call": None,
    }

    websocket_message = {
        "old_messages": old_messages,
        "new_messages": [
            {"role": message["role"], "content": message["content"]}
            for message in new_messages
        ],
        "function_schemas": [dict(x) for x in function_schemas],
        "model": run_config.model,
    }

    res = websocket_manager.stream(
        cli_access_key, LocalTask.RUN_CHAT_MODEL, websocket_message
    )
    error_type = None
    error_log = None
    async for chunk in res:
        if "status" in chunk:
            if "raw_output" in chunk:
                current_message["content"] += chunk["raw_output"]
            if "function_call" in chunk:
                if current_message["function_call"] is None:
                    current_message["function_call"] = chunk["function_call"]
                else:
                    current_message["function_call"] = update_dict(
                        current_message["function_call"], chunk["function_call"]
                    )

            if "function_response" in chunk:
                response_messages.append(current_message)
                current_message = {
                    "role": "assistant",
                    "content": "",
                    "function_call": None,
                }
                response_messages.append(
                    {
                        "role": "function",
                        "name": chunk["function_response"]["name"],
                        "content": chunk["function_response"]["response"],
                    }
                )

            if chunk["status"] in ["completed", "failed"]:
                if (
                    current_message["content"] != ""
                    or current_message["function_call"] is not None
                ):
                    error_type = chunk["error_type"] if "error_type" in chunk else None
                    error_log = chunk["log"] if "log" in chunk else None
                    response_messages.append(current_message)

        yield json.dumps(chunk)

    if error_type and (
        error_type == LocalTaskErrorType.NO_FUNCTION_NAMED_ERROR.value
        or error_type == LocalTaskErrorType.SERVICE_ERROR.value
    ):
        return

    # save new messages
    new_chat_message_rows = [ChatMessage(**message) for message in new_messages]
    session.add_all(new_chat_message_rows)
    await session.flush()

    # save response messages
    for message in response_messages:
        message["name"] = None if "name" not in message else message["name"]
        message["session_uuid"] = session_uuid

    if error_type:
        response_messages[-1]["chat_message_metadata"] = {
            "error_occurs": True,
            "error_log": error_log,
        }

    response_chat_message_rows = [
        ChatMessage(**message) for message in response_messages
    ]
    session.add_all(response_chat_message_rows)
    await session.flush()
    # get last 2 messages
    last_two_messages = (
        (
            await session.execute(
                select(ChatMessage)
                .where(ChatMessage.session_uuid == session_uuid)
                .order_by(desc(ChatMessage.created_at))
                .limit(2)
            )
        )
        .scalars()
        .all()
    )

    # make ChatLog
    chat_log = ChatLog(
        user_message_uuid=last_two_messages[1].uuid,
        assistant_message_uuid=last_two_messages[0].uuid,
        session_uuid=session_uuid,
        project_uuid=project["uuid"],
    )
    session.add(chat_log)

    await session.flush()

    if need_project_version_update:
        await session.execute(
            update(Project)
            .where(Project.uuid == project["uuid"])
            .values(version=project["version"] + 1)
        )
        await session.flush()

    if len(changelogs) > 0:
        session.add(
            ProjectChangelog(
                **{
                    "logs": changelogs,
                    "project_uuid": project["uuid"],
                }
            )
        )

    await session.commit()
