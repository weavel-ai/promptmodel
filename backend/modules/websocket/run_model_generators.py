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
    sample_name: Optional[str] = run_config.sample_name
    prompts: List[PromptConfig] = run_config.prompts

    # get sample from db
    if sample_name:
        sample_input_rows = (
            await session.execute(
                select(SampleInput.content)
                .where(SampleInput.name == run_config.sample_name)
                .where(SampleInput.project_uuid == project["uuid"])
            )
        ).scalar_one()

        sample_input: Dict = sample_input_rows
    else:
        sample_input = None

    prompt_variables = []

    for prompt in prompts:
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

    if sample_input:
        data = {
            "status": "running",
            "inputs": sample_input if sample_input else None,
        }
        yield json.dumps(data)

        messages_for_run = [
            {
                "content": prompt.content.format(**sample_input),
                "role": prompt.role,
            }
            for prompt in prompts
        ]
    else:
        messages_for_run = [p.model_dump() for p in prompts]

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
    )  # function_schemas includes mock_response

    run_log: Dict[str, Any] = {
        "inputs": sample_input,
        "raw_output": None,
        "parsed_outputs": {},
        "function_call": None,
        "input_register_name": run_config.sample_name,
        "version_uuid": run_config.version_uuid,
        "run_log_metadata": None,
        "run_from_deployment": False,
    }

    function_model_version_config: Dict[str, Any] = {
        "version": 0,
        "uuid": run_config.version_uuid,
        "function_model_uuid": run_config.function_model_uuid,
        "model": run_config.model,
        "from_version": run_config.from_version,
        "parsing_type": run_config.parsing_type,
        "output_keys": run_config.output_keys,
        "functions": run_config.functions,
    }
    need_project_version_update = False
    changelogs = []
    if function_model_version_config["uuid"] is None:
        del function_model_version_config["uuid"]
        # find latest version
        if run_config.from_version is None:
            function_model_version_config["is_published"] = True
            function_model_version_config["version"] = 1
            new_function_model_version_row = FunctionModelVersion(
                **function_model_version_config
            )
            session.add(new_function_model_version_row)
            await session.commit()
            await session.refresh(new_function_model_version_row)

            # update project version
            need_project_version_update = True
            changelogs += [
                {
                    "subject": "function_model_version",
                    "identifier": [str(new_function_model_version_row.uuid)],
                    "action": "ADD",
                },
                {
                    "subject": "function_model_version",
                    "identifier": [str(new_function_model_version_row.uuid)],
                    "action": "PUBLISH",
                },
            ]
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

            function_model_version_config["version"] = latest_version + 1

            new_function_model_version_row = FunctionModelVersion(
                **function_model_version_config
            )
            session.add(new_function_model_version_row)
            await session.commit()
            await session.refresh(new_function_model_version_row)

            changelogs.append(
                {
                    "subject": "function_model_version",
                    "identifier": [str(new_function_model_version_row.uuid)],
                    "action": "ADD",
                }
            )

        # add res[0]["uuid"] for each prompt
        prompt_dict = [p.model_dump() for p in prompts]
        for prompt in prompt_dict:
            prompt["version_uuid"] = str(new_function_model_version_row.uuid)

        prompt_row_list = [Prompt(**prompt) for prompt in prompt_dict]
        session.add_all(prompt_row_list)
        await session.commit()

        function_model_version_config["uuid"] = str(new_function_model_version_row.uuid)

        data = {
            "function_model_version_uuid": function_model_version_config["uuid"],
            "version": function_model_version_config["version"],
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

    res = websocket_manager.stream(
        cli_access_key, LocalTask.RUN_PROMPT_MODEL, websocket_message
    )
    error_type = None
    error_log = None
    async for chunk in res:
        # check output and update DB
        if "raw_output" in chunk:
            if run_log["raw_output"] is None:
                run_log["raw_output"] = ""
            run_log["raw_output"] += chunk["raw_output"]

        if "parsed_outputs" in chunk:
            run_log["parsed_outputs"] = update_dict(
                run_log["parsed_outputs"], chunk["parsed_outputs"]
            )

        if "function_call" in chunk:
            run_log["function_call"]: Dict = chunk["function_call"]

        if "function_response" in chunk:
            run_log["function_call"]["response"] = chunk["function_response"][
                "response"
            ]  # TODO: if add tool call, change this to use chunk["function_response"]["name"] to find each call-response pair

        if chunk["status"] in ["completed", "failed"]:
            error_type = chunk["error_type"] if "error_type" in chunk else None
            error_log = chunk["log"] if "log" in chunk else None
            await save_run_log(
                session,
                function_model_version_config,
                run_log,
                error_type,
                error_log,
            )

        yield json.dumps(chunk)

    if need_project_version_update:
        await session.execute(
            update(Project)
            .where(Project.uuid == project["uuid"])
            .values(version=project["version"] + 1)
        )
        await session.commit()

    if len(changelogs) > 0:
        session.add(ProjectChangelog(project_uuid=project["uuid"], logs=changelogs))
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
            await session.commit()
            await session.refresh(new_chat_model_version_row)
            # update project version
            need_project_version_update = True
            changelogs += [
                {
                    "subject": "chat_model_version",
                    "identifier": [str(new_chat_model_version_row.uuid)],
                    "action": "ADD",
                    "project_uuid": project["uuid"],
                },
                {
                    "subject": "chat_model_version",
                    "identifier": [str(new_chat_model_version_row.uuid)],
                    "action": "PUBLISH",
                    "project_uuid": project["uuid"],
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
            await session.commit()
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
        await session.commit()
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
    error_type = (None,)
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
                    await save_chat_messages(
                        project["uuid"],
                        session,
                        session_uuid,
                        new_messages,
                        response_messages,
                        error_type,
                        error_log,
                    )

        yield json.dumps(chunk)

    if need_project_version_update:
        await session.execute(
            update(Project)
            .where(Project.uuid == project["uuid"])
            .values(version=project["version"] + 1)
        )
        await session.commit()

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


async def save_run_log(
    session: AsyncSession,
    function_model_version_config: Optional[Dict[str, Any]] = None,
    run_log: Optional[Dict[str, Any]] = None,
    local_task_error_type: Optional[LocalTaskErrorType] = None,
    error_log: Optional[str] = None,
):
    if local_task_error_type:
        if (
            local_task_error_type == LocalTaskErrorType.NO_FUNCTION_NAMED_ERROR.value
            or local_task_error_type == LocalTaskErrorType.SERVICE_ERROR.value
        ):
            return

        elif (
            local_task_error_type == LocalTaskErrorType.FUNCTION_CALL_FAILED_ERROR.value
            or local_task_error_type == LocalTaskErrorType.PARSING_FAILED_ERROR.value
        ):
            # add version_uuid for run_log
            run_log["version_uuid"] = function_model_version_config["uuid"]

            # add error logs for run_log
            run_log["run_log_metadata"] = {"error_occurs": True, "error_log": error_log}
            session.add(RunLog(**run_log))
            await session.commit()

            return
        else:
            return

    else:
        # add version_uuid for run_log
        run_log["version_uuid"] = function_model_version_config["uuid"]
        session.add(RunLog(**run_log))
        await session.commit()

        return


async def save_chat_messages(
    project_uuid: str,
    session: AsyncSession,
    session_uuid: Optional[str] = None,
    new_messages: Optional[List[Dict[str, Any]]] = None,
    response_messages: Optional[List[Dict[str, Any]]] = None,
    local_task_error_type: Optional[LocalTaskErrorType] = None,
    error_log: Optional[str] = None,
):
    if local_task_error_type:
        if (
            local_task_error_type == LocalTaskErrorType.NO_FUNCTION_NAMED_ERROR.value
            or local_task_error_type == LocalTaskErrorType.SERVICE_ERROR.value
        ):
            return

        elif (
            local_task_error_type == LocalTaskErrorType.FUNCTION_CALL_FAILED_ERROR.value
            or local_task_error_type == LocalTaskErrorType.PARSING_FAILED_ERROR.value
        ):
            # save new messages
            new_chat_message_rows = [ChatMessage(**message) for message in new_messages]
            session.add_all(new_chat_message_rows)
            await session.commit()

            # save response messages
            for message in response_messages:
                message["name"] = None if "name" not in message else message["name"]
                message["session_uuid"] = session_uuid

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
                project_uuid=project_uuid,
            )
            session.add(chat_log)

            await session.commit()
            return
        else:
            return

    else:
        # save new messages
        new_chat_message_rows = [ChatMessage(**message) for message in new_messages]
        session.add_all(new_chat_message_rows)
        await session.commit()

        # save response messages
        for message in response_messages:
            message["session_uuid"] = session_uuid
            message["name"] = None if "name" not in message else message["name"]

        response_chat_message_rows = [
            ChatMessage(**message) for message in response_messages
        ]
        session.add_all(response_chat_message_rows)

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
            project_uuid=project_uuid,
        )
        session.add(chat_log)

        await session.commit()

        return