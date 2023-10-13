import { create } from "zustand";

type RunLog = {
  inputs?: Record<string, any>;
  raw_output?: string;
  parsed_outputs?: Record<string, any>;
};

export type Prompt = { role: string; step: number; content: string };

type Store = {
  selectedVersionUuid: string | null;
  runLogs: Record<string, RunLog>;
  prompts: Record<string, Prompt[]>;
  newVersionUuidCache: string | null;
  newPromptCache: Prompt[];
};

type Actions = {
  setSelectedVersionUuid: (version: string) => void;
  updateRunLogs: (version: string, runLog: RunLog) => void;
  updatePrompts: (version: string, prompts: Prompt[]) => void;
  setNewVersionUuidCache: (uuid: string) => void;
  setNewPromptCache: (prompts: Prompt[]) => void;
};

export const useModuleVersionStore = create<Store & Actions>((set) => ({
  selectedVersionUuid: null,
  runLogs: {},
  prompts: {},
  newVersionUuidCache: null,
  newPromptCache: [],
  setSelectedVersionUuid: (uuid) => set({ selectedVersionUuid: uuid }),
  updateRunLogs: (version, runLog) => {
    set((state) => ({
      runLogs: {
        ...state.runLogs,
        [version]: {
          ...state.runLogs[version],
          ...runLog,
        },
      },
    }));
  },
  updatePrompts: (version, prompts) => {
    set((state) => ({
      prompts: {
        ...state.prompts,
        [version]: prompts,
      },
    }));
  },
  setNewVersionUuidCache: (uuid) => set({ newVersionUuidCache: uuid }),
  setNewPromptCache: (prompts) => set({ newPromptCache: prompts }),
}));
