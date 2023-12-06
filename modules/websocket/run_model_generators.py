import re
import json
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from enum import Enum

# from base.database import supabase
from utils.logger import logger
from utils.prompt_utils import update_dict
from modules.types import (
    ChatLog,
    ChatModelRunConfig,
    PromptConfig,
    PromptModelRunConfig,
    RunLog,
    LocalTaskErrorType,
)
from base.websocket_connection import websocket_manager, LocalTask


async def run_local_prompt_model_generator(
    project, cli_access_key: str, run_config: PromptModelRunConfig
):
    sample_name: Optional[str] = run_config.sample_name
    prompts: List[PromptConfig] = run_config.prompts

    # get sample from db
    if sample_name:
        sample_input_rows = (
            supabase.table("sample_input")
            .select("*")
            .eq("name", sample_name)
            .eq("project_uuid", project["uuid"])
            .execute()
            .data
        )
        # if len(sample_input_rows) != 1:
        #     logger.error(f"There is no sample input {sample_name}.")
        #     return MessagesWithInputs(
        #         error=True, error_message=f"There is no sample input {sample_name}."
        #     )
        # if "contents" not in sample_input_rows[0]:
        #     logger.error(f"There is no sample input {sample_name}.")
        #     return MessagesWithInputs(
        #         error=True, error_message=f"There is no sample input {sample_name}."
        #     )

        sample_input: Dict = sample_input_rows[0]["content"]
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
        supabase.table("function_schema")
        .select("name, description, parameters, mock_response")
        .eq("project_uuid", project["uuid"])
        .in_("name", run_config.functions)
        .execute()
        .data
    )  # function_schemas includes mock_response

    run_log: Dict[str, Any] = {
        "inputs": sample_input,
        "raw_output": "",
        "parsed_outputs": {},
        "function_call": None,
        "input_register_name": run_config.sample_name,
        "version_uuid": run_config.version_uuid,
        "token_usage": None,  # TODO: add token usage, latency, cost on testing
        "latency": None,
        "cost": None,
        "metadata": None,
        "run_from_deployment": False,
    }

    prompt_model_version_config: Dict[str, Any] = {
        "version": 0,
        "uuid": run_config.version_uuid,
        "prompt_model_uuid": run_config.prompt_model_uuid,
        "model": run_config.model,
        "from_version": run_config.from_version,
        "parsing_type": run_config.parsing_type,
        "output_keys": run_config.output_keys,
        "functions": run_config.functions,
    }
    need_project_version_update = False
    changelogs = []
    if prompt_model_version_config["uuid"] is None:
        del prompt_model_version_config["uuid"]
        # find latest version
        if run_config.from_version is None:
            prompt_model_version_config["is_published"] = True
            prompt_model_version_config["version"] = 1
            prompt_model_version = (
                supabase.table("prompt_model_version")
                .insert(prompt_model_version_config)
                .execute()
                .data
            )
            # update project version
            need_project_version_update = True
            changelogs += [
                {
                    "subject": "prompt_model_version",
                    "identifier": [prompt_model_version[0]["uuid"]],
                    "action": "ADD",
                },
                {
                    "subject": "prompt_model_version",
                    "identifier": [prompt_model_version[0]["uuid"]],
                    "action": "PUBLISH",
                },
            ]
        else:
            latest_version = (
                supabase.table("prompt_model_version")
                .select("version")
                .eq(
                    "prompt_model_uuid",
                    run_config.prompt_model_uuid,
                )
                .order("version", desc=True)
                .limit(1)
                .single()
                .execute()
                .data["version"]
            )

            prompt_model_version_config["version"] = latest_version + 1

            prompt_model_version = (
                supabase.table("prompt_model_version")
                .insert(prompt_model_version_config)
                .execute()
                .data
            )

            changelogs.append(
                {
                    "subject": "prompt_model_version",
                    "identifier": [prompt_model_version[0]["uuid"]],
                    "action": "ADD",
                }
            )

        # add res[0]["uuid"] for each prompt
        prompt_dict = [p.model_dump() for p in prompts]
        for prompt in prompt_dict:
            prompt["version_uuid"] = prompt_model_version[0]["uuid"]

        (supabase.table("prompt").insert(prompt_dict).execute())

        prompt_model_version_config["uuid"] = prompt_model_version[0]["uuid"]

        data = {
            "prompt_model_version_uuid": prompt_model_version_config["uuid"],
            "version": prompt_model_version_config["version"],
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

        yield json.dumps(chunk)

    save_run_log(
        prompt_model_version_config,
        run_log,
        error_type,
        error_log,
    )

    if need_project_version_update:
        (
            supabase.table("project")
            .update({"version": project["version"] + 1})
            .eq("uuid", project["uuid"])
            .execute()
        )
    if len(changelogs) > 0:
        supabase.table("project_changelog").insert(
            {"project_uuid": project["uuid"], "logs": changelogs}
        ).execute()


async def run_local_chat_model_generator(
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
        chat_logs: List[Dict] = (
            supabase.table("chat_log")
            .select("role, name, content, tool_calls")
            .eq("session_uuid", session_uuid)
            .order("created_at", desc=False)
            .execute()
            .data
        )
        old_messages += chat_logs
        # delete None values
        old_messages = [
            {k: v for k, v in message.items() if v is not None}
            for message in old_messages
        ]

    # add function schemas
    function_schemas = (
        supabase.table("function_schema")
        .select("name, description, parameters, mock_response")
        .eq("project_uuid", project["uuid"])
        .in_("name", run_config.functions)
        .execute()
        .data
    )

    user_input = run_config.user_input

    if chat_model_version_config["uuid"] is None:
        del chat_model_version_config["uuid"]
        # find latest version
        if run_config.from_version is None:
            chat_model_version_config["is_published"] = True
            chat_model_version_config["version"] = 1
            res = (
                supabase.table("chat_model_version")
                .insert(chat_model_version_config)
                .execute()
                .data
            )
            # update project version
            need_project_version_update = True
            changelogs += [
                {
                    "subject": "chat_model_version",
                    "identifier": [res[0]["uuid"]],
                    "action": "ADD",
                    "project_uuid": project["uuid"],
                },
                {
                    "subject": "chat_model_version",
                    "identifier": [res[0]["uuid"]],
                    "action": "PUBLISH",
                    "project_uuid": project["uuid"],
                },
            ]
        else:
            latest_version = (
                supabase.table("chat_model_version")
                .select("version")
                .eq("chat_model_uuid", run_config.chat_model_uuid)
                .order("version", desc=True)
                .limit(1)
                .single()
                .execute()
                .data["version"]
            )

            chat_model_version_config["version"] = latest_version + 1

            res = (
                supabase.table("chat_model_version")
                .insert(chat_model_version_config)
                .execute()
                .data
            )
            changelogs.append(
                {
                    "subject": "chat_model_version",
                    "identifier": [res[0]["uuid"]],
                    "action": "ADD",
                }
            )

        chat_model_version_config["uuid"] = res[0]["uuid"]

        data = {
            "chat_model_version_uuid": chat_model_version_config["uuid"],
            "version": chat_model_version_config["version"],
            "status": "running",
        }
        yield json.dumps(data)

    # make session
    if session_uuid is None:
        res = (
            supabase.table("chat_log_session")
            .insert(
                {
                    "version_uuid": chat_model_version_config["uuid"],
                    "run_from_deployment": False,
                }
            )
            .execute()
            .data
        )
        session_uuid = res[0]["uuid"]
        data = {
            "chat_log_session_uuid": session_uuid,
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
        "function_schemas": function_schemas,
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

        yield json.dumps(chunk)

    save_chat_logs(
        session_uuid,
        new_messages,
        response_messages,
        error_type,
        error_log,
    )

    if need_project_version_update:
        (
            supabase.table("project")
            .update({"version": project["version"] + 1})
            .eq("uuid", project["uuid"])
            .execute()
        )
    if len(changelogs) > 0:
        supabase.table("project_changelog").insert(
            {"project_uuid": project["uuid"], "logs": changelogs}
        ).execute()


def save_run_log(
    prompt_model_version_config: Optional[Dict[str, Any]] = None,
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
            run_log["version_uuid"] = prompt_model_version_config["uuid"]

            # add error logs for run_log
            run_log["metadata"] = {"error_occurs": True, "error_log": error_log}
            supabase.table("run_log").insert(run_log).execute()

            return
        else:
            return

    else:
        # add version_uuid for run_log
        run_log["version_uuid"] = prompt_model_version_config["uuid"]
        supabase.table("run_log").insert(run_log).execute()

        return


def save_chat_logs(
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
            supabase.table("chat_log").insert(new_messages).execute()

            # save response messages
            for message in response_messages:
                message["tool_calls"] = None
                message["name"] = None if "name" not in message else message["name"]
                if "function_call" in message:
                    message["tool_calls"] = message["function_call"]
                    del message["function_call"]
                message["session_uuid"] = session_uuid

            response_messages[-1]["metadata"] = {
                "error_occurs": True,
                "error_log": error_log,
            }
            supabase.table("chat_log").insert(response_messages).execute()
            return
        else:
            return

    else:
        # save new messages
        supabase.table("chat_log").insert(new_messages).execute()

        # save response messages
        for message in response_messages:
            message["session_uuid"] = session_uuid
            message["tool_calls"] = None
            message["name"] = None if "name" not in message else message["name"]
            if "function_call" in message:
                message["tool_calls"] = message["function_call"]
                del message["function_call"]

        supabase.table("chat_log").insert(response_messages).execute()
        return
