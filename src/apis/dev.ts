import { fetchStream, railwayDevClient } from "./base";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { data } from "autoprefixer";

export async function fetchDevBranch(
  supabaseClient: SupabaseClient,
  projectUuid: string,
  devName: string
) {
  const res = await supabaseClient
    .from("dev_branch")
    .select("online, sync")
    .match({
      project_uuid: projectUuid,
      name: devName,
    });
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
  console.log(projectUuid);
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
        console.log("Change received!", payload);
        if (payload.new["name"] == devName) {
          onUpdate(payload.new);
        }
      }
    )
    .subscribe();

  return devBranchStream;
}

export async function fetchModules(projectUuid: string, devName: string) {
  const res = await railwayDevClient.get("/list_modules", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
    },
  });
  return res.data.llm_modules;
}

export async function fetchModuleVersions(
  projectUuid: string,
  devName: string,
  moduleUuid: string
) {
  const res = await railwayDevClient.get("/list_versions", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
      llm_module_uuid: moduleUuid,
    },
  });
  return res.data.llm_module_versions;
}

export async function fetchPrompts(
  projectUuid: string,
  devName: string,
  moduleVersionUuid: string
) {
  const res = await railwayDevClient.get("/get_prompts", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
      llm_module_version_uuid: moduleVersionUuid,
    },
  });
  return res.data.prompts;
}

export async function fetchRunLogs(
  projectUuid: string,
  devName: string,
  moduleVersionUuid: string
) {
  const res = await railwayDevClient.get("/get_run_logs", {
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
      llm_module_version_uuid: moduleVersionUuid,
    },
  });
  return res.data;
}

export async function streamLLMModuleRun({
  projectUuid,
  devName,
  moduleUuid,
  moduleName,
  sampleName,
  prompts,
  model,
  fromUuid,
  uuid,
  onNewData,
}: {
  projectUuid: string;
  devName: string;
  moduleUuid: string;
  moduleName: string;
  sampleName: string;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  fromUuid?: string | null;
  uuid?: string | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/dev/run_llm_module",
    params: {
      project_uuid: projectUuid,
      dev_name: devName,
    },
    body: {
      llm_module_uuid: moduleUuid,
      llm_module_name: moduleName,
      sample_name: sampleName,
      prompts: prompts,
      from_uuid: fromUuid,
      uuid: uuid,
      model: model,
    },
    onNewData: onNewData,
  });
}

export async function deployVersion({
  projectUuid,
  moduleName,
  moduleUuid,
  fromUuid,
  runLogs,
  prompts,
}: {
  projectUuid: string;
  moduleName: string;
  moduleUuid: string;
  fromUuid: string | null;
  runLogs: {
    inputs?: Record<string, any>;
    raw_output?: string;
    parsed_outputs?: Record<string, any>;
  }[];
  prompts: { role: string; step: number; content: string }[];
}) {
  const res = await railwayDevClient.post(
    "/push_version",
    {
      llm_module_uuid: moduleUuid,
      module_name: moduleName,
      from_uuid: fromUuid,
      run_logs: runLogs,
      prompts: prompts,
    },
    {
      params: {
        project_uuid: projectUuid,
      },
    }
  );
  return res.data;
}
