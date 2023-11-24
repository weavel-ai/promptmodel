import { checkIfValidUUID } from "@/utils";
import { fetchStream, railwayDevClient } from "./base";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

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
