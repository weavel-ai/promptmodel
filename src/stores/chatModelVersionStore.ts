import { editor } from "monaco-editor";
import { create } from "zustand";

export type RunLog = {
  inputs?: Record<string, any> | string;
  raw_output?: string;
  parsed_outputs?: Record<string, any> | string;
  function_call?: Record<string, any> | string;
};

type NewVersionCache = {
  uuid: string | null;
  systemPrompt: string | null;
  model: string | null;
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
  newVersionCache: NewVersionCache | null;
  focusedEditor: editor.ICodeEditor | null;
  fullScreenChatVersion: string | null;
};

type Actions = {
  setSelectedChatModelVersionUuid: (version: string) => void;
  setOriginalVersionData: (data: Record<string, any> | null) => void;
  setSelectedModel: (model: string) => void;
  setSelectedFunctions: (functions: string[]) => void;
  setModifiedSystemPrompt: (prompt: string) => void;
  setNewVersionCache: (cache: NewVersionCache | null) => void;
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
  newVersionCache: null,
  focusedEditor: null,
  fullScreenChatVersion: null,
  setSelectedChatModelVersionUuid: (uuid) =>
    set({ selectedChatModelVersionUuid: uuid }),
  setOriginalVersionData: (data) => set({ originalVersionData: data }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setSelectedFunctions: (functions) => set({ selectedFunctions: functions }),
  setModifiedSystemPrompt: (prompt) => set({ modifiedSystemPrompt: prompt }),
  setNewVersionCache: (cache) => set({ newVersionCache: cache }),
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
