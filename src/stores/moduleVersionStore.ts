import { create } from "zustand";

export type RunLog = {
  inputs?: Record<string, any> | string;
  raw_output?: string;
  parsed_outputs?: Record<string, any> | string;
};

export type Prompt = { role: string; step: number; content: string };

type Store = {
  selectedVersionUuid: string | null;
  runLogs: Record<string, Record<string, RunLog>>;
  prompts: Record<string, Prompt[]>;
  runTasksCount: Record<string | "new", number>;
  newVersionUuidCache: string | null;
  newPromptCache: Prompt[];
};

type Actions = {
  setSelectedVersionUuid: (version: string) => void;
  updateRunLogs: (version: string, uuid: string, runLog: RunLog) => void;
  updatePrompts: (version: string, prompts: Prompt[]) => void;
  addRunTask: (version: string | "new") => void;
  removeRunTask: (version: string | "new") => void;
  setNewVersionUuidCache: (uuid: string) => void;
  setNewPromptCache: (prompts: Prompt[]) => void;
};

export const useModuleVersionStore = create<Store & Actions>((set) => ({
  selectedVersionUuid: null,
  runLogs: {},
  prompts: {},
  runTasksCount: {},
  newVersionUuidCache: null,
  newPromptCache: [],
  setSelectedVersionUuid: (uuid) => set({ selectedVersionUuid: uuid }),
  updateRunLogs: (version, uuid, runLog) => {
    set((state) => ({
      runLogs: {
        ...state.runLogs,
        [version]: {
          ...state.runLogs[version],
          [uuid]: {
            ...state.runLogs[version]?.[uuid],
            ...runLog,
          },
        },
      },
    }));
  },
  removeRunLog: (version, uuid) => {
    set((state) => {
      const { [uuid]: _, ...rest } = state.runLogs;
      return { runLogs: rest };
    });
  },
  updatePrompts: (version, prompts) => {
    set((state) => ({
      prompts: {
        ...state.prompts,
        [version]: prompts,
      },
    }));
  },
  addRunTask: (version) => {
    set((state) => ({
      runTasksCount: {
        ...state.runTasksCount,
        [version]: (state.runTasksCount[version] || 0) + 1,
      },
    }));
  },
  removeRunTask: (version) => {
    set((state) => ({
      runTasksCount: {
        ...state.runTasksCount,
        [version]: Math.max(state.runTasksCount[version] - 1, 0),
      },
    }));
  },
  setNewVersionUuidCache: (uuid) => set({ newVersionUuidCache: uuid }),
  setNewPromptCache: (prompts) => set({ newPromptCache: prompts }),
}));
