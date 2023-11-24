import { fetchStream } from "./base";

export async function streamChatModelRun({
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
