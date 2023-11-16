import { editor } from "monaco-editor";
import { create } from "zustand";

export type RunLog = {
  inputs?: Record<string, any> | string;
  raw_output?: string;
  parsed_outputs?: Record<string, any> | string;
  function_call?: Record<string, any> | string;
};

type Store = {
  selectedChatModelVersionUuid: string | null;
  chatModelVersionLists: Record<string, any>;
  originalVersionData: Record<string, any> | null;
  selectedModel: string;
  selectedFunctions: string[];
  modifiedSystemPrompt: string;
  chatLogs: Record<string, Record<string, RunLog>>;
  runTasksCount: Record<string | "new", number>;
  newVersionUuidCache: string | null;
  focusedEditor: editor.ICodeEditor | null;
  fullScreenChatVersion: string | null;
};

type Actions = {
  setSelectedChatModelVersionUuid: (version: string) => void;
  setOriginalVersionData: (data: Record<string, any> | null) => void;
  setSelectedModel: (model: string) => void;
  setSelectedFunctions: (functions: string[]) => void;
  setModifiedSystemPrompt: (prompt: string) => void;
  setNewVersionUuidCache: (uuid: string) => void;
  updateChatModelVersionLists: (
    promptModelUuid: string,
    versionList: any
  ) => void;
  setFocusedEditor: (editor: editor.ICodeEditor | null) => void;
  setFullScreenChatVersion: (uuid: string | null) => void;
};

export const useChatModelVersionStore = create<Store & Actions>((set) => ({
  selectedChatModelVersionUuid: null,
  chatModelVersionLists: {},
  originalVersionData: null,
  selectedModel: "gpt-3.5-turbo",
  selectedFunctions: [],
  modifiedSystemPrompt: "",
  chatLogs: {},
  runTasksCount: {},
  newVersionUuidCache: null,
  focusedEditor: null,
  fullScreenChatVersion: null,
  setSelectedChatModelVersionUuid: (uuid) =>
    set({ selectedChatModelVersionUuid: uuid }),
  setOriginalVersionData: (data) => set({ originalVersionData: data }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedFunctions: (functions) => set({ selectedFunctions: functions }),
  setModifiedSystemPrompt: (prompt) => set({ modifiedSystemPrompt: prompt }),
  setNewVersionUuidCache: (uuid) => set({ newVersionUuidCache: uuid }),
  updateChatModelVersionLists: (chatModelUuid, versionList) =>
    set((state) => ({
      chatModelVersionLists: {
        ...state.chatModelVersionLists,
        [chatModelUuid]: versionList,
      },
    })),
  setFocusedEditor: (editor) => set({ focusedEditor: editor }),
  setFullScreenChatVersion: (uuid) => set({ fullScreenChatVersion: uuid }),
}));
