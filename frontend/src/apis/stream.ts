import { fetchStream } from "./base";

export async function streamFunctionModelRun({
  sampleInputUuid,
  projectUuid,
  functionModelUuid,
  prompts,
  model,
  fromVersion,
  versionUuid,
  sampleInput,
  parsingType,
  outputKeys,
  functions,
  onNewData,
}: {
  sampleInputUuid: string | null;
  projectUuid: string;
  functionModelUuid?: string;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  fromVersion?: string | null;
  versionUuid?: string | null;
  sampleInput?: Record<string, string>;
  parsingType?: string | null;
  outputKeys?: string[] | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/web/run_function_model",
    params: {
      project_uuid: projectUuid,
    },
    body: {
      sample_input_uuid: sampleInputUuid,
      function_model_uuid: functionModelUuid,
      prompts: prompts,
      model: model,
      from_version: fromVersion,
      version_uuid: versionUuid,
      sample_input: sampleInput,
      parsing_type: parsingType,
      output_keys: outputKeys,
      functions: functions,
    },
    onNewData: onNewData,
  });
}

export async function streamLocalFunctionModelRun({
  projectUuid,
  functionModelUuid,
  sampleInputUuid,
  prompts,
  model,
  fromVersion,
  versionUuid,
  sampleInput,
  parsingType,
  outputKeys,
  functions,
  onNewData,
}: {
  projectUuid: string;
  functionModelUuid: string | null;
  sampleInputUuid: string | null;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  fromVersion?: string | null;
  versionUuid?: string | null;
  sampleInput?: Record<string, string>;
  parsingType?: string | null;
  outputKeys?: string[] | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/dev/run_function_model",
    params: {
      project_uuid: projectUuid,
    },
    body: {
      function_model_uuid: functionModelUuid,
      sample_input_uuid: sampleInputUuid,
      prompts: prompts,
      model: model,
      from_version: fromVersion,
      version_uuid: versionUuid,
      sample_input: sampleInput,
      parsing_type: parsingType,
      output_keys: outputKeys,
      functions: functions,
    },
    onNewData: onNewData,
  });
}

export async function streamChatModelRun({
  projectUuid,
  chatModelUuid,
  systemPrompt,
  userInput,
  model,
  fromVersion,
  sessionUuid,
  versionUuid,
  functions,
  onNewData,
}: {
  projectUuid: string;
  chatModelUuid: string;
  systemPrompt: string;
  userInput: string;
  model: string;
  fromVersion?: number | null;
  versionUuid?: string | null;
  sessionUuid?: string | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/web/run_chat_model",
    params: {
      project_uuid: projectUuid,
    },
    body: {
      chat_model_uuid: chatModelUuid,
      system_prompt: systemPrompt,
      user_input: userInput,
      model: model,
      from_version: fromVersion,
      session_uuid: sessionUuid,
      version_uuid: versionUuid,
      functions: functions,
    },
    onNewData: onNewData,
  });
}

export async function streamLocalChatModelRun({
  projectUuid,
  chatModelUuid,
  systemPrompt,
  userInput,
  model,
  fromVersion,
  sessionUuid,
  versionUuid,
  functions,
  onNewData,
}: {
  projectUuid: string;
  chatModelUuid: string;
  systemPrompt: string;
  userInput: string;
  model: string;
  fromVersion?: number | null;
  versionUuid?: string | null;
  sessionUuid?: string | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/dev/run_chat_model",
    params: {
      project_uuid: projectUuid,
    },
    body: {
      chat_model_uuid: chatModelUuid,
      system_prompt: systemPrompt,
      user_input: userInput,
      model: model,
      from_version: fromVersion,
      session_uuid: sessionUuid,
      version_uuid: versionUuid,
      functions: functions,
    },
    onNewData: onNewData,
  });
}
