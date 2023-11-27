import { fetchStream } from "./base";

export async function streamPromptModelRun({
  projectUuid,
  promptModelUuid,
  prompts,
  model,
  fromVersion,
  versionUuid,
  sampleName,
  parsingType,
  outputKeys,
  functions,
  onNewData,
}: {
  projectUuid: string;
  promptModelUuid: string;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  fromVersion?: string | null;
  versionUuid?: string | null;
  sampleName: string;
  parsingType?: string | null;
  outputKeys?: string[] | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/web/run_prompt_model",
    params: {
      project_uuid: projectUuid,
    },
    body: {
      prompt_model_uuid: promptModelUuid,
      prompts: prompts,
      model: model,
      from_version: fromVersion,
      version_uuid: versionUuid,
      sample_name: sampleName,
      parsing_type: parsingType,
      output_keys: outputKeys,
      functions: functions,
    },
    onNewData: onNewData,
  });
}

export async function streamLocalPromptModelRun({
  projectUuid,
  promptModelUuid,
  prompts,
  model,
  fromVersion,
  versionUuid,
  sampleName,
  parsingType,
  outputKeys,
  functions,
  onNewData,
}: {
  projectUuid: string;
  promptModelUuid: string;
  prompts: { role: string; step: number; content: string }[];
  model: string;
  fromVersion?: string | null;
  versionUuid?: string | null;
  sampleName: string;
  parsingType?: string | null;
  outputKeys?: string[] | null;
  functions?: string[] | null;
  onNewData?: (data: Record<string, any>) => void;
}) {
  await fetchStream({
    url: "/dev/run_prompt_model",
    params: {
      project_uuid: projectUuid,
    },
    body: {
      prompt_model_uuid: promptModelUuid,
      prompts: prompts,
      model: model,
      from_version: fromVersion,
      version_uuid: versionUuid,
      sample_name: sampleName,
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
