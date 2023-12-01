import { useChatModelVersionStore } from "@/stores/chatModelVersionStore";
import { ArrowUp, CornersOut } from "@phosphor-icons/react";
import classNames from "classnames";
import { useEffect, useMemo, useRef, useState } from "react";
import { ModalPortal } from "./ModalPortal";
import dayjs from "dayjs";
import { ChatSessionSelector } from "./select/ChatSessionSelector";
import {
  arePrimitiveListsEqual,
  cloneDeep,
  firstLetterToUppercase,
} from "@/utils";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import relativeTime from "dayjs/plugin/relativeTime";
import { useChatModelVersion } from "@/hooks/useChatModelVersion";
import { useChatLogSessions } from "@/hooks/useChatLogSession";
import { useSessionChatLogs } from "@/hooks/useSessionChatLogs";
import { streamChatModelRun, streamLocalChatModelRun } from "@/apis/stream";
import { useChatModel } from "@/hooks/useChatModel";
import { useProject } from "@/hooks/useProject";
dayjs.extend(relativeTime);

export function ChatUI({
  versionUuid,
  className,
}: {
  versionUuid: string | "new" | null;
  className?: string;
}) {
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [selectedSessionUuid, setSelectedSessionUuid] = useState(null);
  const { projectUuid, projectData } = useProject();
  const { chatModelUuid, chatModelData } = useChatModel();
  const { chatModelVersionListData, refetchChatModelVersionListData } =
    useChatModelVersion();
  const { chatLogSessionListData, refetchChatLogSessionListData } =
    useChatLogSessions(versionUuid);
  const {
    fullScreenChatVersion,
    newVersionCache,
    selectedModel,
    selectedFunctions,
    originalVersionData,
    modifiedSystemPrompt,
    selectedChatModelVersion,
    setSelectedChatModelVersion,
    setNewVersionCache,
    setFullScreenChatVersion,
  } = useChatModelVersionStore();
  const {
    chatLogListData,
    setChatLogListData,
    refetchChatLogListData,
    resetChatLogListData,
  } = useSessionChatLogs(selectedSessionUuid);
  const scrollDivRef = useRef(null);

  // useEffect(() => {
  //   resetChatLogListData();
  // }, [selectedChatModelVersionUuid]);

  // Set initial session uuid
  useEffect(() => {
    console.log(chatLogSessionListData);
    if (chatLogSessionListData?.length > 1) {
      setSelectedSessionUuid(chatLogSessionListData[1].uuid);
    } else {
      setSelectedSessionUuid(null);
    }
  }, [chatLogSessionListData, selectedChatModelVersion]);

  // Scroll to bottom whenever chatLogListData changes
  useEffect(() => {
    if (scrollDivRef.current) {
      scrollDivRef.current.scrollTo({
        top: scrollDivRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatLogListData, generatedMessage]);

  // Run ChatModel
  async function handleSubmit() {
    const userInput = chatInput;
    setChatLogListData([
      ...chatLogListData,
      {
        role: "user",
        content: chatInput,
        created_at: new Date().toISOString(),
      },
    ]);
    setChatInput("");
    setGeneratedMessage("");
    setIsLoading(true);
    const isNewVersion = versionUuid === "new";
    let systemPrompt: string;
    let newVersionUuid: string;

    if (isNewVersion) {
      systemPrompt = modifiedSystemPrompt;
    } else {
      systemPrompt = originalVersionData.system_prompt;
    }

    let cacheRawOutput = "";
    let cacheFunctionCallData = {};

    const args = {
      projectUuid: projectUuid as string,
      chatModelUuid: chatModelUuid,
      userInput: userInput,
      systemPrompt: systemPrompt,
      model: isNewVersion ? selectedModel : originalVersionData.model,
      fromVersion: isNewVersion ? originalVersionData?.version : null,
      sessionUuid: selectedSessionUuid,
      versionUuid: isNewVersion ? null : originalVersionData?.uuid,
      functions: isNewVersion
        ? selectedFunctions
        : originalVersionData?.functions,
      onNewData: async (data) => {
        switch (data?.status) {
          case "completed":
            refetchChatLogListData();
            setGeneratedMessage(null);
            setIsLoading(false);
            break;
          case "failed":
            await refetchChatLogListData();
            setGeneratedMessage(null);
            toast.error(data?.log, {
              autoClose: 4000,
            });
            setIsLoading(false);
            break;
        }
        if (data?.chat_model_version_uuid && isNewVersion) {
          setNewVersionCache({
            uuid: data?.chat_model_version_uuid,
            version: data?.version,
            systemPrompt: systemPrompt,
            model: selectedModel,
            functions: cloneDeep(selectedFunctions),
          });
        }
        if (data?.chat_log_session_uuid) {
          await refetchChatLogSessionListData();
          setSelectedSessionUuid(data.chat_log_session_uuid);
        }
        if (data?.raw_output) {
          cacheRawOutput += data?.raw_output;
          setGeneratedMessage(cacheRawOutput);
        }
      },
    };

    if (projectData?.online) {
      await streamLocalChatModelRun(args);
    } else {
      await streamChatModelRun(args);
    }
    setIsLoading(false);

    if (isNewVersion) {
      await refetchChatModelVersionListData();
      if (!originalVersionData?.uuid) {
        setSelectedChatModelVersion(1);
      }
    }
  }

  const mainUI = (
    <div className={classNames("w-full h-full flex flex-col gap-y-2")}>
      <div className="w-full flex flex-row justify-between items-center">
        <div className="flex flex-row justify-start items-center gap-x-4">
          <p className="text-xl font-semibold ps-2">Chat</p>
          <ChatSessionSelector
            versionUuid={versionUuid}
            selectedSessionUuid={selectedSessionUuid}
            setSelectedSessionUuid={setSelectedSessionUuid}
          />
        </div>
        <button
          className="btn btn-sm bg-transparent border-transparent items-center hover:bg-neutral-content/20 flex flex-row"
          onClick={() => {
            if (fullScreenChatVersion == versionUuid) {
              setFullScreenChatVersion(null);
            } else {
              setFullScreenChatVersion(versionUuid);
            }
          }}
        >
          <CornersOut size={22} />
          {fullScreenChatVersion == versionUuid && (
            <kbd className="kbd">Esc</kbd>
          )}
        </button>
      </div>
      <div className="flex flex-col justify-between w-full h-full overflow-hidden">
        <div ref={scrollDivRef} className="flex-grow w-full overflow-auto">
          <div className="flex-grow w-full flex flex-col justify-start gap-y-2 p-2">
            {chatLogListData?.map((chatLog, idx) => {
              return (
                <div
                  className={classNames(
                    "chat",
                    chatLog.role == "user" ? "chat-end" : "chat-start"
                  )}
                  key={idx}
                >
                  <div className="chat-header">
                    {firstLetterToUppercase(chatLog.role)}
                    <time className="text-xs opacity-50 ml-2">
                      {dayjs(chatLog.created_at).fromNow()}
                    </time>
                  </div>
                  <div
                    className={classNames(
                      "chat-bubble",
                      chatLog.role == "assistant" && "bg-base-300"
                    )}
                  >
                    {chatLog.content}
                  </div>
                  {chatLog.token_usage && (
                    <div className="chat-footer opacity-50">
                      {chatLog.token_usage} tokens
                    </div>
                  )}
                </div>
              );
            })}
            {generatedMessage != null && (
              <div className="chat chat-start">
                <div className="chat-header">
                  Assistant
                  <time className="text-xs opacity-50 ml-2">
                    {dayjs().fromNow()}
                  </time>
                </div>
                <div className="chat-bubble bg-base-300">
                  {generatedMessage?.length == 0 ? (
                    <div className="loading loading-dots loading-sm" />
                  ) : (
                    <p>{generatedMessage}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <ChatInput
          onSubmit={handleSubmit}
          chatInput={chatInput}
          setChatInput={setChatInput}
          isLoading={isLoading}
          isNewVersion={versionUuid == "new"}
        />
      </div>
    </div>
  );

  if (fullScreenChatVersion != versionUuid) {
    return (
      <div
        className={classNames(
          "w-full h-full rounded-box bg-base-200 p-4",
          className
        )}
      >
        {mainUI}
      </div>
    );
  } else {
    return (
      <ModalPortal>
        <motion.div
          className="fixed bottom-0 right-0 z-[999999] bg-base-200/70 backdrop-blur-md p-4 flex justify-center items-center"
          initial={{ width: "50vw", height: "40vh" }}
          animate={{
            width: "100vw",
            height: "100vh",
          }}
        >
          <div className="max-w-5xl w-full h-full">{mainUI}</div>
        </motion.div>
      </ModalPortal>
    );
  }
}

const ChatInput = ({
  onSubmit,
  chatInput,
  setChatInput,
  isLoading,
  isNewVersion,
}: {
  onSubmit: () => void;
  chatInput: string;
  setChatInput: (input: string) => void;
  isLoading: boolean;
  isNewVersion: boolean;
}) => {
  const {
    originalVersionData,
    modifiedSystemPrompt,
    selectedModel,
    selectedFunctions,
    newVersionCache,
  } = useChatModelVersionStore();

  const disabledMessage = useMemo(() => {
    if (isLoading) return true;
    if (chatInput.length == 0) return true;
    console.log(isNewVersion);
    if (isNewVersion) {
      if (modifiedSystemPrompt?.length == 0)
        return "Please enter a system prompt";
      if (
        originalVersionData?.system_prompt == modifiedSystemPrompt &&
        selectedModel == originalVersionData?.model &&
        arePrimitiveListsEqual(
          selectedFunctions,
          originalVersionData?.functions ?? []
        )
      )
        return "Prompt & model config is equal to original version";
      if (
        newVersionCache?.systemPrompt == modifiedSystemPrompt &&
        newVersionCache?.model == selectedModel &&
        arePrimitiveListsEqual(selectedFunctions, newVersionCache?.functions)
      )
        return "Prompt & model config is equal to previous version";
    }
    return false;
  }, [
    chatInput,
    isLoading,
    isNewVersion,
    selectedModel,
    modifiedSystemPrompt,
    originalVersionData,
  ]);

  return (
    <form
      className={classNames(
        "bg-popover h-14 w-full max-w-5xl mx-auto rounded-box flex-shrink-0 flex flex-row justify-between items-center px-2"
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (isLoading || disabledMessage) return;
        onSubmit();
      }}
    >
      <input
        type="text"
        className={classNames(
          "ml-4 w-full focus:outline-none bg-transparent",
          "text-popover-content"
        )}
        placeholder="Enter message..."
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
      />
      {isLoading ? (
        <div className="rounded-lg w-12 bg-base-content flex justify-center items-center h-10">
          <div className="loading loading-spinner loading-sm text-base-100" />
        </div>
      ) : (
        <div
          className={classNames(
            typeof disabledMessage == "string" &&
              "tooltip tooltip-left tooltip-accent"
          )}
          data-tip={disabledMessage}
        >
          <SendChatButton
            onClick={onSubmit}
            disabled={Boolean(disabledMessage)}
          />
        </div>
      )}
    </form>
  );
};

function SendChatButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      className="flex justify-center items-center btn btn-sm bg-base-content text-popover normal-case font-normal h-10 hover:bg-base-content/80 hover:text-popover/80 disabled:bg-muted"
      onClick={onClick}
      disabled={disabled}
    >
      <ArrowUp size={20} weight="bold" />
    </button>
  );
}
