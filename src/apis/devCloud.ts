import { fetchStream, railwayWebClient } from "./base";
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

export async function fetchChatModels(
  supabaseClient: SupabaseClient,
  devUuid: string,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("chat_model")
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

export async function createChatModel({
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
    .from("chat_model")
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
    .select(
      "uuid, created_at, version, from_uuid, dev_from_uuid, model, is_published, is_ab_test, ratio, parsing_type, output_keys, functions, status, is_deployed"
    )
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("prompt_model_uuid", promptModelUuid)
    .order("version", { ascending: true });

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

export async function fetchChatModelVersions(
  supabaseClient: SupabaseClient,
  devUuid: string,
  chatModelUuid: string
) {
  const res = await supabaseClient
    .from("chat_model_version")
    .select(
      "uuid, created_at, version, from_uuid, dev_from_uuid, model, system_prompt, is_published, is_ab_test, ratio, functions, status, is_deployed"
    )
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("chat_model_uuid", chatModelUuid)
    .order("version", { ascending: true });

  return res.data;
}

export async function updateChatModelVersionStatus(
  supabaseClient: SupabaseClient,
  devUuid: string,
  versionUuid: string,
  status: "broken" | "working" | "candidate"
) {
  await supabaseClient
    .from("chat_model_version")
    .update({
      status: status,
    })
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("uuid", versionUuid);
}

export async function fetchRunLogs(
  supabaseClient: SupabaseClient,
  devUuid: string,
  promptModelVersionUuid: string
) {
  const res = await supabaseClient
    .from("run_log")
    .select(
      "created_at, inputs, raw_output, parsed_outputs, run_from_deployment"
    )
    .or(`dev_branch_uuid.eq.${devUuid},dev_branch_uuid.is.null`)
    .eq("version_uuid", promptModelVersionUuid);

  return res.data;
}

export async function fetchSampleInputs(
  supabaseClient: SupabaseClient,
  projectUuid: string
) {
  const res = await supabaseClient
    .from("sample_input")
    .select("created_at, name, content")
    .eq("project_uuid", projectUuid);

  return res.data;
}

export async function createSampleInput(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  name: string,
  content: string
) {
  const res = await supabaseClient.from("sample_input").insert({
    project_uuid: projectUuid,
    name: name,
    content: content,
  });
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

export async function streamChatModelRun({
  devUuid,
  chatModelUuid,
  systemPrompt,
  sessionUuid,
  userInput,
  model,
  fromUuid,
  versionUuid,
  functions,
  onNewData,
}: {
  devUuid: string;
  chatModelUuid: string;
  systemPrompt: string;
  sessionUuid: string;
  userInput: string;
  model: string;
  fromUuid?: string | null;
  versionUuid?: string | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/web/run_chat_model",
    params: {
      dev_uuid: devUuid,
    },
    body: {
      chat_model_uuid: chatModelUuid,
      system_prompt: systemPrompt,
      session_uuid: sessionUuid,
      user_input: userInput,
      from_uuid: fromUuid,
      version_uuid: versionUuid,
      model: model,
      functions: functions,
    },
    onNewData: onNewData,
  });
}

export async function deployCandidates({
  projectUuid,
  devUuid,
  promptModelUuid = null,
  chatModelUuid = null,
}: {
  projectUuid: string;
  devUuid: string;
  promptModelUuid?: string | null;
  chatModelUuid?: string | null;
}) {
  const res = await railwayWebClient.post(
    "/push_versions",
    {},
    {
      params: {
        project_uuid: projectUuid,
        dev_uuid: devUuid,
        prompt_model_uuid: promptModelUuid,
        chat_model_uuid: chatModelUuid,
      },
    }
  );
  return res.data;
}
