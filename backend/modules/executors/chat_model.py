from datetime import timezone
from typing import AsyncGenerator, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, asc, desc, update
from promptmodel.llms.llm_dev import LLMDev
from promptmodel.types.response import LLMStreamResponse

from utils import logger
from utils.prompt_utils import update_dict
from api.common.models.models import ChatModelRunConfig
from api.web.models.organization import LLMProviderArgs
from db_models import *

async def run_cloud_chat_model(
    session: AsyncSession,
    project_uuid: str,
    chat_config: ChatModelRunConfig,
    provider_args: LLMProviderArgs,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Run ChatModel from cloud deployment environment.

    Args:
        chat_config (ChatModelRunConfig):
            chat_model_uuid: (str)
            system_prompt: str
            user_input: str
            model: str
            from_version: previous version number (Optional)
            session_uuid: current session uuid (Optional)
            version_uuid: current version uuid (Optional if from_version is provided)
            functions: List of functions (Optional)

    Returns:
        AsyncGenerator: Dict[str, Any]
            status: "completed" | "failed" | "running"
            chat_session_uuid: Optional[str]
            log: Optional[str]

    """
    try:
        start_timestampz_iso = datetime.now(timezone.utc)
        chat_model_dev = LLMDev()
        chat_model_version_uuid: Union[str, None] = chat_config.version_uuid
        session_uuid: Union[str, None] = chat_config.session_uuid
        messages = [{"role": "system", "content": chat_config.system_prompt}]
        need_project_version_update = False
        changelogs = []

        # If chat_model_version_uuid is None, create new version
        if chat_model_version_uuid is None:
            version: int
            if chat_config.from_version is None:
                version = 1
                need_project_version_update = True
            else:
                latest_version = (
                    await session.execute(
                        select(ChatModelVersion.version)
                        .where(
                            ChatModelVersion.chat_model_uuid
                            == chat_config.chat_model_uuid
                        )
                        .order_by(desc(ChatModelVersion.version))
                        .limit(1)
                    )
                ).scalar_one()

                version = latest_version + 1

            new_chat_model_version_row = ChatModelVersion(
                **{
                    "chat_model_uuid": chat_config.chat_model_uuid,
                    "from_version": chat_config.from_version,
                    "version": version,
                    "model": chat_config.model,
                    "system_prompt": chat_config.system_prompt,
                    "functions": chat_config.functions,
                    "is_published": True if version == 1 else False,
                }
            )
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
            if need_project_version_update:
                changelogs.append(
                    {
                        "subject": "chat_model_version",
                        "identifier": [str(new_chat_model_version_row.uuid)],
                        "action": "PUBLISH",
                    }
                )

            chat_model_version_uuid: str = str(new_chat_model_version_row.uuid)

            data = {
                "chat_model_version_uuid": chat_model_version_uuid,
                "version": version,
                "status": "running",
            }
            yield data

        # If session uuid is None, create new session
        if session_uuid is None:
            new_session = ChatSession(
                **{
                    "version_uuid": chat_model_version_uuid,
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
            yield data
        else:
            # If session exists, fetch session chat logs from cloud db
            session_chat_messages = (
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
            messages += session_chat_messages
            messages = [
                {k: v for k, v in message.items() if v is not None}
                for message in messages
            ]

        # Append user input to messages
        messages.append({"role": "user", "content": chat_config.user_input})

        # Stream chat
        res: AsyncGenerator[LLMStreamResponse, None] = chat_model_dev.dev_chat(
            messages=messages,
            model=chat_config.model,
            # functions=function_schemas,
            **provider_args.model_dump(),
        )

        # TODO: Add function call support
        raw_output = ""
        function_call = None
        error_log = None
        error_occurs = False
        async for item in res:
            if item.raw_output is not None:
                raw_output += item.raw_output
                data = {
                    "status": "running",
                    "raw_output": item.raw_output,
                }

            if item.function_call is not None:
                if function_call is None:
                    function_call = {}
                data = {
                    "status": "running",
                    "function_call": item.function_call.model_dump(),
                }
                function_call = update_dict(
                    function_call, item.function_call.model_dump()
                )

            if item.error:
                error_log = item.error_log
                error_occurs = item.error

            yield data

        # Create chat log
        user_message_uuid = str(uuid4())
        assistant_message_uuid = str(uuid4())
        user_chat_message = ChatMessage(
            **{
                "uuid": user_message_uuid,
                "created_at": start_timestampz_iso,
                "session_uuid": session_uuid,
                "role": "user",
                "content": chat_config.user_input,
            }
        )
        session.add(user_chat_message)
        await session.flush()

        assistant_created_at = datetime.now(timezone.utc)
        assistant_chat_message = ChatMessage(
            **{
                "uuid": assistant_message_uuid,
                "created_at": assistant_created_at,
                "session_uuid": session_uuid,
                "role": "assistant",
                "content": raw_output,
                "function_call": function_call,
                "chat_message_metadata": {"error": True, "error_log": error_log}
                if error_occurs
                else None,
            }
        )
        session.add(assistant_chat_message)
        await session.flush()

        session.add(
            ChatLog(
                user_message_uuid=user_message_uuid,
                assistant_message_uuid=assistant_message_uuid,
                session_uuid=session_uuid,
                project_uuid=project_uuid,
            )
        )

        await session.flush()

        data = {
            "status": "completed",
        }
        yield data

        if len(changelogs) > 0:
            session.add(
                ProjectChangelog(
                    **{
                        "logs": changelogs,
                        "project_uuid": project_uuid,
                    }
                )
            )
            await session.flush()
        if need_project_version_update:
            project_version = (
                await session.execute(
                    select(Project.version).where(Project.uuid == project_uuid)
                )
            ).scalar_one()

            await session.execute(
                update(Project)
                .where(Project.uuid == project_uuid)
                .values(version=project_version + 1)
            )
            await session.flush()

        await session.commit()

    except Exception as exc:
        logger.error(f"Error running service: {exc}")
        data = {
            "status": "failed",
            "log": str(exc),
        }
        yield data
        raise exc
