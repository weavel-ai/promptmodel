import { fetchStream, railwayDevClient } from "./base";
import { SupabaseClient } from "@supabase/supabase-js";

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

export async function fetchModules(
  supabaseClient: SupabaseClient,
  devUuid: string,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("llm_module")
    .select("name, uuid, created_at, dev_branch_uuid")
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("project_uuid", projectUuid);

  return res.data;
}

export async function createModel({
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
    .from("llm_module")
    .insert({
      dev_branch_uuid: devUuid,
      project_uuid: projectUuid,
      name: name,
    })
    .select("uuid")
    .single();

  return res.data;
}

export async function fetchModuleVersions(
  supabaseClient: SupabaseClient,
  devUuid: string,
  moduleUuid: string
) {
  const res = await supabaseClient
    .from("llm_module_version")
    .select("*")
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("llm_module_uuid", moduleUuid);

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

export async function updateVersionStatus(
  supabaseClient: SupabaseClient,
  devUuid: string,
  versionUuid: string,
  status: "broken" | "working" | "candidate"
) {
  await supabaseClient
    .from("llm_module_version")
    .update({
      status: status,
    })
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("uuid", versionUuid);
}

export async function fetchPrompts(
  supabaseClient: SupabaseClient,
  moduleVersionUuid: string
) {
  const res = await supabaseClient
    .from("prompt")
    .select("role, step, content")
    .eq("version_uuid", moduleVersionUuid);
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
  moduleVersionUuid: string
) {
  const res = await supabaseClient
    .from("run_log")
    .select("created_at, inputs, raw_output, parsed_outputs, is_deployment")
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("version_uuid", moduleVersionUuid);

  return res.data;
}

export async function streamLLMModuleRun({
  devUuid,
  moduleUuid,
  moduleName,
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
  moduleUuid: string;
  moduleName: string;
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
    url: "/web/run_llm_module",
    params: {
      dev_uuid: devUuid,
    },
    body: {
      llm_module_uuid: moduleUuid,
      llm_module_name: moduleName,
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
  moduleUuid = null,
}: {
  projectUuid: string;
  devName: string;
  moduleUuid?: string | null;
}) {
  const res = await railwayDevClient.post(
    "/push_versions",
    {},
    {
      params: {
        project_uuid: projectUuid,
        dev_name: devName,
        moduleUuid: moduleUuid,
      },
    }
  );
  return res.data;
}
