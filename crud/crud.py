"""APIs for package management"""
import asyncio
import json

from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Result, select, asc, desc, update


from base.database import get_session, get_session_context
from db_models import *
from modules.types import (
    InstanceType,
)


async def save_instances(
    session: AsyncSession,
    function_models: List[Dict],
    chat_models: List[Dict],
    sample_inputs: List[Dict],
    function_schemas: List[Dict],
) -> Dict[str, Any]:
    async with session.begin_nested():
        # Insert prompt models
        current_time = datetime.utcnow()

        function_models = [FunctionModel(**data) for data in function_models]
        session.add_all(function_models)

        # Insert chat models
        chat_models = [ChatModel(**data) for data in chat_models]
        session.add_all(chat_models)

        # Insert sample inputs
        sample_inputs = [SampleInput(**data) for data in sample_inputs]
        session.add_all(sample_inputs)

        # Insert function schemas
        function_schemas = [FunctionSchema(**data) for data in function_schemas]
        session.add_all(function_schemas)

        await session.flush()

        for obj in function_models:
            await session.refresh(obj)

        for obj in chat_models:
            await session.refresh(obj)

        for obj in sample_inputs:
            await session.refresh(obj)

        for obj in function_schemas:
            await session.refresh(obj)

        print(function_models)
        return {
            "function_model_rows": [r.model_dump() for r in function_models],
            "chat_model_rows": [r.model_dump() for r in chat_models],
            "sample_input_rows": [r.model_dump() for r in sample_inputs],
            "function_schema_rows": [r.model_dump() for r in function_schemas],
        }


async def pull_instances(session: AsyncSession, project_uuid: str) -> Dict[str, Any]:
    # select FunctionModel, ChatModel, SampleInput, FunctionSchema whose project_uuid is project_uuid
    function_model_query = select(FunctionModel).where(
        FunctionModel.project_uuid == project_uuid
    )
    chat_model_query = select(ChatModel).where(ChatModel.project_uuid == project_uuid)
    sample_input_query = select(SampleInput).where(
        SampleInput.project_uuid == project_uuid
    )
    function_schema_query = select(FunctionSchema).where(
        FunctionSchema.project_uuid == project_uuid
    )

    function_model_data = await session.execute(function_model_query)
    chat_model_data = await session.execute(chat_model_query)
    sample_input_data = await session.execute(sample_input_query)
    function_schema_data = await session.execute(function_schema_query)

    return {
        "function_model_data": [
            r.model_dump() for r in function_model_data.scalars().all()
        ],
        "chat_model_data": [r.model_dump() for r in chat_model_data.scalars().all()],
        "sample_input_data": [
            r.model_dump() for r in sample_input_data.scalars().all()
        ],
        "function_schema_data": [
            r.model_dump() for r in function_schema_data.scalars().all()
        ],
    }


async def update_instances(
    session: AsyncSession,
    project_uuid: str,
    function_model_names: List[str],
    chat_model_names: List[str],
    sample_input_names: List[str],
    function_schema_names: List[str],
    sample_inputs: List[Dict],
    function_schemas: List[Dict],
) -> Dict[str, Any]:
    function_call = text(
        """
        SELECT * FROM update_instances(
            :input_project_uuid,
            :function_model_names,
            :chat_model_names,
            :sample_input_names,
            :function_schema_names,
            :sample_inputs,
            :function_schemas
        )
    """
    )
    result = await session.execute(
        function_call,
        {
            "input_project_uuid": project_uuid,
            "function_model_names": function_model_names,
            "chat_model_names": chat_model_names,
            "sample_input_names": sample_input_names,
            "function_schema_names": function_schema_names,
            "sample_inputs": json.dumps(
                sample_inputs
            ),  # Ensure this is a JSON-compatible format
            "function_schemas": json.dumps(
                function_schemas
            ),  # Ensure this is a JSON-compatible format
        },
    )
    await session.commit()
    return result.mappings().one()


async def disconnect_local(token: str):
    """Disconnect local instance from Supabase
        SQL:

    CREATE OR REPLACE FUNCTION disconnect_local(token TEXT) RETURNS VOID AS $$
    DECLARE
        found_project_uuid UUID;
    BEGIN
        SELECT uuid INTO found_project_uuid FROM project WHERE cli_access_key = token;

        UPDATE project
        SET cli_access_key = NULL, online = FALSE
        WHERE cli_access_key = token;

        UPDATE function_model
        SET online = FALSE
        WHERE project_uuid = found_project_uuid;

        UPDATE chat_model
        SET online = FALSE
        WHERE project_uuid = found_project_uuid;

        UPDATE sample_input
        SET online = FALSE
        WHERE project_uuid = found_project_uuid;

        UPDATE function_schema
        SET online = FALSE
        WHERE project_uuid = found_project_uuid;

        RETURN;
    END;
    $$ LANGUAGE plpgsql;

    """
    async with get_session_context() as session:
        function_call = text(
            """
            SELECT * FROM disconnect_local(:token)
        """
        )
        await session.execute(function_call, {"token": token})
        await session.commit()
        return
