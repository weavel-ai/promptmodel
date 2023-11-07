import { checkIfValidUUID } from "@/utils";
import { fetchStream, railwayDevClient } from "./base";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export async function fetchDevBranch(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  nameOrUuid: string
) {
  let matchObj = {};

  if (checkIfValidUUID(nameOrUuid)) {
    matchObj = { uuid: nameOrUuid, project_uuid: projectUuid };
  } else {
    matchObj = { name: nameOrUuid, project_uuid: projectUuid };
  }

  const res = await supabaseClient
    .from("dev_branch")
    .select("online, sync, cloud")
    .match(matchObj);
  return res.data;
}

export async function updateDevBranchSync(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  devName: string,
  sync: boolean
) {
  await supabaseClient.from("dev_branch").update({ sync: sync }).match({
    project_uuid: projectUuid,
    name: devName,
  });
}

export function subscribeDevBranchStatus(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  devName: string,
  onUpdate: (data: any) => void
): RealtimeChannel {
  const devBranchStream = supabaseClient
    .channel("any")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dev_branch",
        // filter: `name=eq.${devName}`,
        // filter: `project_uuid=eq.${projectUuid}`,
        filter: `project_uuid=eq.${projectUuid}`,
      },
      (payload) => {
        if (payload.new["name"] == devName) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return devBranchStream;
}

export async function fetchPromptModels(projectUuid: string, devName: string) {
  const res = await railwayDevClient.get("/list_prompt_models", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
    },
  });
  return res.data.prompt_models;
}

export async function fetchPromptModelVersions(
  projectUuid: string,
  devName: string,
  promptModelUuid: string
) {
  const res = await railwayDevClient.get("/list_prompt_model_versions", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
      prompt_model_uuid: promptModelUuid,
    },
  });
  return res.data.prompt_model_versions;
}

export async function fetchFunctions(
  projectUuid: string,
  devName: string
): Promise<Record<string, any>[]> {
  const res = await railwayDevClient.get("/list_functions", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
    },
  });
  return res.data.functions;
}

export async function updatePromptModelVersionStatus(
  projectUuid: string,
  devName: string,
  versionUuid: string,
  status: "broken" | "working" | "candidate"
) {
  await railwayDevClient.post(
    "/change_prompt_model_version_status",
    {},
    {
      params: {
        project_uuid: projectUuid,
        dev_name: devName,
        prompt_model_version_uuid: versionUuid,
        status: status,
      },
    }
  );
}

export async function fetchPrompts(
  projectUuid: string,
  devName: string,
  promptModelVersionUuid: string
) {
  const res = await railwayDevClient.get("/get_prompts", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
      prompt_model_version_uuid: promptModelVersionUuid,
    },
  });
  return res.data.prompts;
}

export async function fetchSamples(projectUuid: string, devName: string) {
  const res = await railwayDevClient.get("/list_samples", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
    },
  });
  return res.data.samples;
}

export async function fetchRunLogs(
  projectUuid: string,
  devName: string,
  promptModelVersionUuid: string
) {
  const res = await railwayDevClient.get("/get_run_logs", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
      prompt_model_version_uuid: promptModelVersionUuid,
    },
  });
  return res.data.run_logs;
}

export async function streamPromptModelRun({
  projectUuid,
  devName,
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
  projectUuid: string;
  devName: string;
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
    url: "/dev/run_prompt_model",
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
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
  chatModelUuid = null,
}: {
  projectUuid: string;
  devName: string;
  promptModelUuid?: string | null;
  chatModelUuid?: string | null;
}) {
  const res = await railwayDevClient.post(
    "/push_versions",
    {},
    {
      params: {
        project_uuid: projectUuid,
        dev_name: devName,
        prompt_model_uuid: promptModelUuid,
        chat_model_uuid: chatModelUuid,
      },
    }
  );
  return res.data;
}
