import { editor } from "monaco-editor";
import { create } from "zustand";

export type RunLog = {
  inputs?: Record<string, any> | string;
  raw_output?: string;
  parsed_outputs?: Record<string, any> | string;
  function_call?: Record<string, any> | string;
};

export type Prompt = { role: string; step: number; content: string };

type Store = {
  selectedVersionUuid: string | null;
  runLogs: Record<string, Record<string, RunLog>>;
  prompts: Record<string, Prompt[]>;
  runTasksCount: Record<string | "new", number>;
  newVersionUuidCache: string | null;
  newPromptCache: Prompt[];
  versionLists: Record<string, any>;
  focusedEditor: editor.ICodeEditor | null;
  showSlashOptions: boolean;
};

type Actions = {
  setSelectedVersionUuid: (version: string) => void;
  updateRunLogs: (version: string, uuid: string, runLog: RunLog) => void;
  updatePrompts: (version: string, prompts: Prompt[]) => void;
  removeRunLog: (version: string, uuid: string) => void;
  addRunTask: (version: string | "new") => void;
  removeRunTask: (version: string | "new") => void;
  setNewVersionUuidCache: (uuid: string) => void;
  setNewPromptCache: (prompts: Prompt[]) => void;
  updateVersionLists: (promptModelUuid: string, versionList: any) => void;
  setFocusedEditor: (editor: editor.ICodeEditor | null) => void;
  setShowSlashOptions: (show: boolean) => void;
};

export const usePromptModelVersionStore = create<Store & Actions>((set) => ({
  selectedVersionUuid: null,
  runLogs: {},
  prompts: {},
  runTasksCount: {},
  newVersionUuidCache: null,
  newPromptCache: [],
  versionLists: {},
  focusedEditor: null,
  showSlashOptions: false,
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
      // Remove uuid from runLogs
      const runLogs = { ...state.runLogs };
      if (runLogs[version]) {
        if (runLogs[version][uuid]) {
          delete runLogs[version][uuid];
        }
      }
      return {
        runLogs,
      };
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
  updateVersionLists: (promptModelUuid, versionList) =>
    set((state) => ({
      versionLists: {
        ...state.versionLists,
        [promptModelUuid]: versionList,
      },
    })),
  setFocusedEditor: (editor) => set({ focusedEditor: editor }),
  setShowSlashOptions: (show) => set({ showSlashOptions: show }),
}));
