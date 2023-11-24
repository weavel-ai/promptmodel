import { fetchStream } from "./base";

export async function streamChatModelRun({
  chatModelUuid,
  systemPrompt,
  sessionUuid,
  userInput,
  model,
  versionUuid,
  functions,
  onNewData,
}: {
  chatModelUuid: string;
  systemPrompt: string;
  userInput: string;
  model: string;
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
      session_uuid: sessionUuid,
      user_input: userInput,
      version_uuid: versionUuid,
      model: model,
      functions: functions,
    },
    onNewData: onNewData,
  });
}
