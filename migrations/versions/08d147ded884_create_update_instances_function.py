"""create update_instances function

Revision ID: 08d147ded884
Revises: b2438abfa54b
Create Date: 2023-12-06 14:45:58.072065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "08d147ded884"
down_revision: Union[str, None] = "b2438abfa54b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """\
create
or replace function update_instances (
  input_project_uuid uuid,
  prompt_model_names text[],
  chat_model_names text[],
  sample_input_names text[],
  function_schema_names text[],
  sample_inputs jsonb,
  function_schemas jsonb
) returns table (sample_input_rows json, function_schema_rows json) as $$
BEGIN
    -- Set all to offline for given project_uuid
    UPDATE prompt_model SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(prompt_model_names) and online = TRUE;
    UPDATE chat_model SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(chat_model_names) and online = TRUE;
    UPDATE sample_input SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(sample_input_names) and online = TRUE;
    UPDATE function_schema SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(function_schema_names) and online = TRUE;

    -- Update and set online = TRUE for specific uuids
    UPDATE prompt_model SET online = TRUE WHERE name = ANY(prompt_model_names) AND prompt_model.project_uuid = input_project_uuid and online = FALSE;
    UPDATE chat_model SET online = TRUE WHERE name = ANY(chat_model_names) AND chat_model.project_uuid = input_project_uuid and online = FALSE;
    UPDATE sample_input SET online = TRUE WHERE name = ANY(sample_input_names) AND sample_input.project_uuid = input_project_uuid and online = FALSE;
    UPDATE function_schema SET online = TRUE WHERE name = ANY(function_schema_names) AND function_schema.project_uuid = input_project_uuid and online = FALSE;

    RETURN QUERY WITH
    original_sample_inputs AS (
        SELECT * FROM sample_input WHERE project_uuid = input_project_uuid
    ),
    updated_sample_inputs AS (
        UPDATE sample_input si SET
            content = (si_new.content)::jsonb
        FROM jsonb_to_recordset(sample_inputs) AS si_new(name text, uuid uuid, content text)
        WHERE 
            si.name = si_new.name 
            AND si.content IS DISTINCT FROM (si_new.content)::jsonb
            AND jsonb_array_length(sample_inputs) > 0 
            AND si.project_uuid = input_project_uuid
        RETURNING si.*
    ),
    original_function_schemas AS (
        SELECT * FROM function_schema WHERE project_uuid = input_project_uuid
    ),
    updated_function_schemas AS (
        UPDATE function_schema fs SET
            description = fs_new.description,
            parameters = (fs_new.parameters)::jsonb
        FROM jsonb_to_recordset(function_schemas) AS fs_new(name text, uuid uuid, description text, parameters jsonb)
        WHERE 
            fs.name = fs_new.name 
            AND (fs.description IS DISTINCT FROM fs_new.description OR fs.parameters IS DISTINCT FROM (fs_new.parameters)::jsonb) 
            AND jsonb_array_length(function_schemas) > 0 
            AND fs.project_uuid = input_project_uuid
        RETURNING fs.*
    )
    SELECT
        json_agg(usi.*) FILTER (WHERE usi.content IS DISTINCT FROM ori_si.content) AS sample_input_rows,
        json_agg(ufs.*) FILTER (WHERE ufs.description IS DISTINCT FROM ori_fs.description OR ufs.parameters IS DISTINCT FROM ori_fs.parameters) AS function_schema_rows
    FROM
        updated_sample_inputs usi
        JOIN original_sample_inputs ori_si ON usi.uuid = ori_si.uuid,
        updated_function_schemas ufs
        JOIN original_function_schemas ori_fs ON ufs.uuid = ori_fs.uuid;
END; $$ language plpgsql;
    """
    )

    op.execute(
        """\
    CREATE OR REPLACE FUNCTION disconnect_local(token TEXT) RETURNS VOID AS $$
    DECLARE
        found_project_uuid UUID;
    BEGIN
        SELECT uuid INTO found_project_uuid FROM project WHERE cli_access_key = token;

        UPDATE project
        SET cli_access_key = NULL, online = FALSE
        WHERE cli_access_key = token;

        UPDATE prompt_model
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
    )


def downgrade() -> None:
    pass
