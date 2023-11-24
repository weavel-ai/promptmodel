import re
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from enum import Enum

from base.database import supabase
from utils.logger import logger


class LocalTaskErrorType(str, Enum):
    NO_FUNCTION_NAMED_ERROR = "NO_FUNCTION_NAMED_ERROR"  # no DB update is needed
    FUNCTION_CALL_FAILED_ERROR = "FUNCTION_CALL_FAILED_ERROR"  # create PromptModelVersion, create Prompt, create RunLog
    PARSING_FAILED_ERROR = "PARSING_FAILED_ERROR"  # create PromptModelVersion, create Prompt, create RunLog

    SERVICE_ERROR = "SERVICE_ERROR"  # no DB update is needed


class MessagesWithInputs:
    def __init__(
        self,
        messages: Optional[List[Dict[str, Any]]] = [],
        inputs: Optional[Dict[str, Any]] = {},
        error: Optional[bool] = False,
        error_message: Optional[str] = None,
    ):
        self.messages = messages
        self.inputs = inputs
        self.error = error
        self.error_message = error_message


def validate_variable_matching(run_config, project_uuid) -> MessagesWithInputs:
    sample_name: Optional[str] = run_config["sample_name"]
    prompts: Dict[str, str] = run_config["prompts"]

    # get sample from db
    if sample_name:
        sample_input_rows = (
            supabase.table("sample_input")
            .select("*")
            .eq("name", sample_name)
            .eq("project_uuid", project_uuid)
            .execute()
            .data
        )
        if len(sample_input_rows) != 1:
            logger.error(f"There is no sample input {sample_name}.")
            return MessagesWithInputs(
                error=True, error_message=f"There is no sample input {sample_name}."
            )
        if "contents" not in sample_input_rows[0]:
            logger.error(f"There is no sample input {sample_name}.")
            return MessagesWithInputs(
                error=True, error_message=f"There is no sample input {sample_name}."
            )

        sample_input: Dict = sample_input_rows[0]["contents"]
    else:
        sample_input = None

    prompt_variables = []

    for prompt in prompts:
        prompt_content: str = prompt["content"]
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
            logger.error(f"There is no sample input {sample_name}.")
            return MessagesWithInputs(
                error=True,
                error_message=f"Prompts have variables {prompt_variables}. You should select sample input.",
            )

        if not all(variable in sample_input.keys() for variable in prompt_variables):
            missing_variables = [
                variable
                for variable in prompt_variables
                if variable not in sample_input.keys()
            ]

            return MessagesWithInputs(
                error=True,
                error_message=f"Sample input does not have variables {missing_variables} in prompts.",
            )

    if sample_input:
        messages_for_run = [
            {
                "content": prompt["content"].format(**sample_input),
                "role": prompt["role"],
            }
            for prompt in prompts
        ]
    else:
        messages_for_run = prompts

    return MessagesWithInputs(messages=messages_for_run, inputs=sample_input)


def update_db_in_prompt_model_run(
    prompt_model_version_config: Optional[Dict[str, Any]] = None,
    run_log: Optional[Dict[str, Any]] = None,
    prompts: Optional[List[Dict[str, Any]]] = None,
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
            if prompt_model_version_config["uuid"] is None:
                # find latest version
                latest_version = (
                    supabase.table("prompt_model_version")
                    .select("version")
                    .eq("project_uuid", prompt_model_version_config["project_uuid"])
                    .order("created_at", desc=True)
                    .execute()
                    .data
                )
                if len(latest_version) == 0:
                    latest_version = 0
                    prompt_model_version_config["is_published"] = True
                else:
                    latest_version = latest_version[0]["version"]

                res = (
                    supabase.table("prompt_model_version")
                    .insert(prompt_model_version_config)
                    .execute()
                )

                # add res.data[0]["uuid"] for each prompt
                for prompt in prompts:
                    prompt["version_uuid"] = res.data[0]["uuid"]

                (supabase.table("prompt").insert(prompts).execute())

                prompt_model_version_config["uuid"] = res.data[0]["uuid"]

            # add version_uuid for run_log
            run_log["version_uuid"] = prompt_model_version_config["uuid"]

            # add error logs for run_log
            run_log["metadata"] = {"error_occurs": True, "error_log": error_log}
            supabase.table("run_log").insert(run_log).execute()

            return
        else:
            return

    else:
        if prompt_model_version_config["uuid"] is None:
            # find latest version
            latest_version = (
                supabase.table("prompt_model_version")
                .select("version")
                .eq("project_uuid", prompt_model_version_config["project_uuid"])
                .order("created_at", desc=True)
                .execute()
                .data
            )
            if len(latest_version) == 0:
                latest_version = 0
                prompt_model_version_config["is_published"] = True
            else:
                latest_version = latest_version[0]["version"]
            prompt_model_version_config["version"] = latest_version + 1

            res = (
                supabase.table("prompt_model_version")
                .insert(prompt_model_version_config)
                .execute()
            )

            # add res.data[0]["uuid"] for each prompt
            for prompt in prompts:
                prompt["version_uuid"] = res.data[0]["uuid"]

            (supabase.table("prompt").insert(prompts).execute())

            prompt_model_version_config["uuid"] = res.data[0]["uuid"]

        # add version_uuid for run_log
        run_log["version_uuid"] = prompt_model_version_config["uuid"]
        supabase.table("run_log").insert(run_log).execute()

        return


def update_db_in_chat_model_run(
    chat_model_version_config: Optional[Dict[str, Any]] = None,
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
            if chat_model_version_config["uuid"] is None:
                # find latest version
                latest_version = (
                    supabase.table("prompt_model_version")
                    .select("version")
                    .eq("project_uuid", chat_model_version_config["project_uuid"])
                    .order("created_at", desc=True)
                    .execute()
                    .data
                )
                if len(latest_version) == 0:
                    latest_version = 0
                    chat_model_version_config["is_published"] = True
                else:
                    latest_version = latest_version[0]["version"]

                res = (
                    supabase.table("prompt_model_version")
                    .insert(chat_model_version_config)
                    .execute()
                )

                chat_model_version_config["uuid"] = res.data[0]["uuid"]

            # make session
            if session_uuid is None:
                res = (
                    supabase.table("chat_log_session")
                    .insert(
                        {
                            "version_uuid": chat_model_version_config["uuid"],
                        }
                    )
                    .execute()
                )
                session_uuid = res.data[0]["uuid"]

            # save new messages
            for message in new_messages:
                message["session_uuid"] = session_uuid
            supabase.table("chat_log").insert(new_messages).execute()

            # save response messages
            for message in response_messages:
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
        if chat_model_version_config["uuid"] is None:
            # find latest version
            latest_version = (
                supabase.table("prompt_model_version")
                .select("version")
                .eq("project_uuid", chat_model_version_config["project_uuid"])
                .order("created_at", desc=True)
                .execute()
                .data
            )
            if len(latest_version) == 0:
                latest_version = 0
                chat_model_version_config["is_published"] = True
            else:
                latest_version = latest_version[0]["version"]

            res = (
                supabase.table("prompt_model_version")
                .insert(chat_model_version_config)
                .execute()
            )

            chat_model_version_config["uuid"] = res.data[0]["uuid"]

        # make session
        if session_uuid is None:
            res = (
                supabase.table("chat_log_session")
                .insert(
                    {
                        "version_uuid": chat_model_version_config["uuid"],
                    }
                )
                .execute()
            )

        # save new messages
        for message in new_messages:
            message["session_uuid"] = session_uuid
        supabase.table("chat_log").insert(new_messages).execute()

        # save response messages
        for message in response_messages:
            message["session_uuid"] = session_uuid
        supabase.table("chat_log").insert(response_messages).execute()
        return
