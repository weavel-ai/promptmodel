"""make view & rpc

Revision ID: 0df20fadc31c
Revises: c3723fe92add
Create Date: 2023-12-11 20:53:54.671585

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0df20fadc31c"
down_revision: Union[str, None] = "65d192446c5b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # make views
    op.execute(
        """create view
  public.user_organizations as
select
  uo.user_id,
  o.organization_id,
  o.name,
  o.slug
from
  users_organizations uo
  left join organization o on o.organization_id = uo.organization_id;"""
    )

    op.execute(
        """create view
  public.run_logs_count as
select
  p.uuid as project_uuid,
  count(rl.version_uuid) as run_logs_count
from
  project p
  left join function_model pm on p.uuid = pm.project_uuid
  left join function_model_version pmv on pm.uuid = pmv.function_model_uuid
  left join run_log rl on pmv.uuid = rl.version_uuid
group by
  p.uuid;"""
    )

    op.execute(
        """create view
  public.deployment_run_log_view as
select
  pm.project_uuid,
  pm.name as function_model_name,
  pm.uuid as function_model_uuid,
  pmv.version as function_model_version,
  pmv.uuid as function_model_version_uuid,
  rl.uuid as run_log_uuid,
  rl.created_at,
  rl.inputs,
  rl.raw_output,
  rl.parsed_outputs,
  rl.run_from_deployment,
  rl.prompt_tokens,
  rl.completion_tokens,
  rl.total_tokens,
  rl.latency,
  rl.cost,
  rl.run_log_metadata,
  rl.function_call,
  rl.tool_calls,
  rl.score
from
  run_log rl
  left join function_model_version pmv on pmv.uuid = rl.version_uuid
  left join function_model pm on pm.uuid = pmv.function_model_uuid
order by
  rl.created_at desc;"""
    )

    op.execute(
        """create view
  public.deployed_function_model_version as
select
  function_model_version.id,
  function_model_version.created_at,
  function_model_version.version,
  function_model_version.uuid,
  function_model_version.from_version,
  function_model_version.function_model_uuid,
  function_model_version.model,
  function_model_version.is_published,
  function_model_version.is_ab_test,
  function_model_version.ratio,
  function_model_version.parsing_type,
  function_model_version.output_keys
from
  function_model_version
where
  function_model_version.is_published = true
  or function_model_version.is_ab_test = true;"""
    )

    op.execute(
        """create view
  public.deployed_chat_model_version as
select
  chat_model_version.id,
  chat_model_version.created_at,
  chat_model_version.version,
  chat_model_version.uuid,
  chat_model_version.from_version,
  chat_model_version.chat_model_uuid,
  chat_model_version.model,
  chat_model_version.is_published,
  chat_model_version.is_ab_test,
  chat_model_version.ratio,
  chat_model_version.system_prompt
from
  chat_model_version
where
  chat_model_version.is_published = true
  or chat_model_version.is_ab_test = true;"""
    )

    op.execute(
        """create view
  public.daily_run_log_metric as
select
  m.name as function_model_name,
  m.uuid as function_model_uuid,
  date (rl.created_at) as day,
  sum(rl.cost::numeric) as total_cost,
  sum(rl.latency) / count(*)::double precision / 1000::double precision as avg_latency,
  sum(rl.prompt_tokens) as total_prompt_tokens,
  sum(rl.completion_tokens) as total_completion_tokens,
  sum(rl.total_tokens) as total_token_usage,
  count(*) as total_runs
from
  function_model m
  left join function_model_version v on v.function_model_uuid = m.uuid
  left join run_log rl on rl.version_uuid = v.uuid
where
  rl.created_at is not null
  and rl.run_from_deployment is true
group by
  m.uuid,
  m.name,
  (date (rl.created_at))
order by
  (date (rl.created_at)),
  m.name;"""
    )

    op.execute(
        """create view
  public.daily_chat_log_metric as
select
  p.name as project_name,
  cm.name as chat_model_name,
  cm.uuid as chat_model_uuid,
  date (cs.created_at) as day,
  sum(cl.cost::numeric) as total_cost,
  sum(cl.latency) / count(cl.*)::double precision / 1000::double precision as avg_latency,
  sum(cl.total_tokens) as total_token_usage,
  count(cs.*) as total_chat_sessions
from
  project p
  left join chat_model cm on cm.project_uuid = p.uuid
  left join chat_model_version v on v.chat_model_uuid = cm.uuid
  left join chat_session cs on cs.version_uuid = v.uuid
  left join chat_log cl on cl.session_uuid = cs.uuid
group by
  p.name,
  cm.name,
  cm.uuid,
  (date (cs.created_at))
order by
  (date (cs.created_at)),
  p.name;"""
    )

    op.execute(
        """create view
  public.chat_logs_count as
select
  p.uuid as project_uuid,
  count(cl.project_uuid) as chat_logs_count
from
  project p
  left join chat_log cl on p.uuid = cl.project_uuid
group by
  p.uuid;"""
    )

    op.execute(
        """create view
  public.chat_log_view as
select
  cl.project_uuid,
  cm.name as chat_model_name,
  cm.uuid as chat_model_uuid,
  cv.uuid as chat_model_version_uuid,
  cv.version as chat_model_version,
  um.created_at,
  um.session_uuid,
  cl.assistant_message_uuid,
  um.content as user_input,
  am.content as assistant_output,
  am.tool_calls,
  am.function_call,
  cl.prompt_tokens,
  cl.completion_tokens,
  cl.total_tokens,
  cl.latency,
  cl.cost,
  session.run_from_deployment
from
  chat_log cl
  left join chat_message um on cl.user_message_uuid = um.uuid
  left join chat_message am on cl.assistant_message_uuid = am.uuid
  join chat_session session on um.session_uuid = session.uuid
  join chat_model_version cv on session.version_uuid = cv.uuid
  join chat_model cm on cv.chat_model_uuid = cm.uuid;"""
    )

    # make RPC functions

    pass
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
    )

    op.execute(
        """\
CREATE OR REPLACE FUNCTION pull_instances(project_uuid uuid)
RETURNS TABLE(
    function_model_data json,
    chat_model_data json,
    sample_input_data json,
    function_schema_data json
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT json_agg(pm.*) FROM function_model pm WHERE pm.project_uuid = pull_instances.project_uuid) AS function_model_data,
        (SELECT json_agg(cm.*) FROM chat_model cm WHERE cm.project_uuid = pull_instances.project_uuid) AS chat_model_data,
        (SELECT json_agg(si.*) FROM sample_input si WHERE si.project_uuid = pull_instances.project_uuid) AS sample_input_data,
        (SELECT json_agg(fs.*) FROM function_schema fs WHERE fs.project_uuid = pull_instances.project_uuid) AS function_schema_data;
END; $$
LANGUAGE plpgsql;"""
    )

    op.execute(
        """\
CREATE OR REPLACE FUNCTION save_instances (
    function_models json,
    chat_models json,
    sample_inputs json,
    function_schemas json
) RETURNS TABLE(
    function_model_rows json,
    chat_model_rows json,
    sample_input_rows json,
    function_schema_rows json
) AS $$
BEGIN
    RETURN QUERY WITH
    inserted_function_models AS (
        INSERT INTO function_model (name, project_uuid)
        SELECT name, project_uuid FROM json_populate_recordset(null::function_model, function_models)
        WHERE json_array_length(function_models) > 0
        RETURNING *
    ),
    inserted_chat_models AS (
        INSERT INTO chat_model (name, project_uuid)
        SELECT name, project_uuid FROM json_populate_recordset(null::chat_model, chat_models)
        WHERE json_array_length(chat_models) > 0
        RETURNING *
    ),
    inserted_sample_inputs AS (
        INSERT INTO sample_input (project_uuid, name, content)
        SELECT project_uuid, name, content FROM json_populate_recordset(null::sample_input, sample_inputs)
        WHERE json_array_length(sample_inputs) > 0
        RETURNING *
    ),
    inserted_function_schemas AS (
        INSERT INTO function_schema (name, description, mock_response, parameters, project_uuid)
        SELECT name, description, mock_response, parameters, project_uuid FROM json_populate_recordset(null::function_schema, function_schemas)
        WHERE json_array_length(function_schemas) > 0
        RETURNING *
    )
    SELECT
        json_agg(ipm.*) AS function_model_rows,
        json_agg(icm.*) AS chat_model_rows,
        json_agg(isi.*) AS sample_input_rows,
        json_agg(ifs.*) AS function_schema_rows
    FROM
        inserted_function_models ipm,
        inserted_chat_models icm,
        inserted_sample_inputs isi,
        inserted_function_schemas ifs;
END; $$
LANGUAGE plpgsql;
        """
    )

    op.execute(
        """\
        create
or replace function update_instances (
  input_project_uuid uuid,
  function_model_names text[],
  chat_model_names text[],
  sample_input_names text[],
  function_schema_names text[],
  sample_inputs jsonb,
  function_schemas jsonb
) returns table (sample_input_rows json, function_schema_rows json) as $$
BEGIN
    -- Set all to offline for given project_uuid
    UPDATE function_model SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(function_model_names) and online = TRUE;
    UPDATE chat_model SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(chat_model_names) and online = TRUE;
    UPDATE sample_input SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(sample_input_names) and online = TRUE;
    UPDATE function_schema SET online = FALSE WHERE project_uuid = input_project_uuid and name != ALL(function_schema_names) and online = TRUE;

    -- Update and set online = TRUE for specific uuids
    UPDATE function_model SET online = TRUE WHERE name = ANY(function_model_names) AND function_model.project_uuid = input_project_uuid and online = FALSE;
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
END; $$ language plpgsql;"""
    )


def downgrade() -> None:
    # drop functions
    op.execute("DROP FUNCTION disconnect_local(token TEXT);")
    op.execute("DROP FUNCTION pull_instances(project_uuid uuid);")
    op.execute("DROP FUNCTION save_instances(json,json,json,json);")
    op.execute(
        "DROP FUNCTION update_instances(uuid,text[],text[],text[],text[],jsonb,jsonb);"
    )

    # drop views

    pass
