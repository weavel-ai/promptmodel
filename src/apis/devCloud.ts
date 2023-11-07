import { fetchStream, railwayDevClient } from "./base";
import { SupabaseClient } from "@supabase/supabase-js";
import { usePromptModel } from "../hooks/dev/usePromptModel";

export async function createDevBranch({
  supabaseClient,
  projectUuid,
  name,
}: {
  supabaseClient: SupabaseClient;
  projectUuid: string;
  name?: string;
}) {
  const res = await supabaseClient
    .from("dev_branch")
    .insert([
      {
        project_uuid: projectUuid,
        name: name,
        cloud: true,
        online: null,
        sync: null,
      },
    ])
    .select("uuid")
    .single();
  return res.data.uuid;
}

export async function fetchPromptModels(
  supabaseClient: SupabaseClient,
  devUuid: string,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("prompt_model")
    .select("name, uuid, created_at, dev_branch_uuid")
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("project_uuid", projectUuid);

  return res.data;
}

export async function createPromptModel({
  supabaseClient,
  devUuid,
  projectUuid,
  name,
}: {
  supabaseClient: SupabaseClient;
  devUuid: string;
  projectUuid: string;
  name: string;
}) {
  const res = await supabaseClient
    .from("prompt_model")
    .insert({
      dev_branch_uuid: devUuid,
      project_uuid: projectUuid,
      name: name,
    })
    .select("uuid")
    .single();

  return res.data;
}

export async function fetchPromptModelVersions(
  supabaseClient: SupabaseClient,
  devUuid: string,
  promptModelUuid: string
) {
  const res = await supabaseClient
    .from("prompt_model_version")
    .select("*")
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("prompt_model_uuid", promptModelUuid);

  return res.data;
}

// export async function fetchFunctions(
//   projectUuid: string,
//   devName: string
// ): Promise<Record<string, any>[]> {
//   const res = await railwayDevClient.get("/list_functions", {
//     params: {
//       project_uuid: projectUuid,
//       dev_name: devName,
//     },
//   });
//   return res.data.functions;
// }

export async function updatePromptModelVersionStatus(
  supabaseClient: SupabaseClient,
  devUuid: string,
  versionUuid: string,
  status: "broken" | "working" | "candidate"
) {
  await supabaseClient
    .from("prompt_model_version")
    .update({
      status: status,
    })
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("uuid", versionUuid);
}

export async function fetchPrompts(
  supabaseClient: SupabaseClient,
  promptModelVersionUuid: string
) {
  const res = await supabaseClient
    .from("prompt")
    .select("role, step, content")
    .eq("version_uuid", promptModelVersionUuid);
  return res.data;
}

// export async function fetchSamples(projectUuid: string, devName: string) {
//   const res = await railwayDevClient.get("/list_samples", {
//     params: {
//       project_uuid: projectUuid,
//       dev_name: devName,
//     },
//   });
//   return res.data.samples;
// }

export async function fetchRunLogs(
  supabaseClient: SupabaseClient,
  devUuid: string,
  promptModelVersionUuid: string
) {
  const res = await supabaseClient
    .from("run_log")
    .select("created_at, inputs, raw_output, parsed_outputs, is_deployment")
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("version_uuid", promptModelVersionUuid);

  return res.data;
}

export async function streamPromptModelRun({
  devUuid,
  promptModelUuid,
  promptModelName,
  sampleName,
  prompts,
  model,
  fromUuid,
  uuid,
  parsingType,
  outputKeys,
  functions,
  onNewData,
}: {
  devUuid: string;
  promptModelUuid: string;
  promptModelName: string;
  sampleName: string;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  fromUuid?: string | null;
  uuid?: string | null;
  parsingType?: string | null;
  outputKeys?: string[] | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/web/run_prompt_model",
    params: {
      dev_uuid: devUuid,
    },
    body: {
      prompt_model_uuid: promptModelUuid,
      prompt_model_name: promptModelName,
      sample_name: sampleName,
      prompts: prompts,
      from_uuid: fromUuid,
      uuid: uuid,
      model: model,
      parsing_type: parsingType,
      output_keys: outputKeys,
      functions: functions,
    },
    onNewData: onNewData,
  });
}

export async function deployCandidates({
  projectUuid,
  devName,
  promptModelUuid = null,
}: {
  projectUuid: string;
  devName: string;
  promptModelUuid?: string | null;
}) {
  const res = await railwayDevClient.post(
    "/push_versions",
    {},
    {
      params: {
        project_uuid: projectUuid,
        dev_name: devName,
        moduleUuid: promptModelUuid,
      },
    }
  );
  return res.data;
}
