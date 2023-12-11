import { ParsingType } from "@/types/ParsingType";
import { editor } from "monaco-editor";
import { create } from "zustand";

export type RunLog = {
  inputs?: Record<string, any> | string;
  raw_output?: string;
  parsed_outputs?: Record<string, any> | string;
  function_call?: Record<string, any> | string;
};

export type Prompt = { role: string; step: number; content: string };

type NewVersionCache = {
  uuid: string;
  version: number;
  prompts: Prompt[];
  model: string;
  parsing_type: ParsingType;
  functions: string[] | null;
  // TODO: Add functions
};

type Store = {
  isCreateVariantOpen: boolean;
  fullScreenRunVersionUuid: string | null;
  selectedFunctionModelVersion: number | null;
  runLogs: Record<string, Record<string, RunLog>>;
  prompts: Record<string, Prompt[]>;
  modifiedPrompts: Prompt[];
  selectedModel: string | null;
  outputKeys: string[];
  selectedParser: ParsingType | null;
  selectedSample: string | null;
  selectedFunctions: string[];
  runTasksCount: Record<string | "new", number>;
  newVersionCache: NewVersionCache | null;
  functionModelVersionLists: Record<string, any>;
  focusedEditor: editor.ICodeEditor | null;
  showSlashOptions: boolean;
};

type Actions = {
  setIsCreateVariantOpen: (isOpen: boolean) => void;
  setFullScreenRunVersionUuid: (version: string) => void;
  setSelectedFunctionModelVersion: (version: number) => void;
  updateRunLogs: (version: string, uuid: string, runLog: RunLog) => void;
  updatePrompts: (version: string, prompts: Prompt[]) => void;
  setModifiedPrompts: (prompts: Prompt[]) => void;
  removeRunLog: (version: string, uuid: string) => void;
  setSelectedModel: (model: string | null) => void;
  setOutputKeys: (keys: string[]) => void;
  setSelectedParser: (parser: ParsingType | null) => void;
  setSelectedSample: (sample: string | null) => void;
  setSelectedFunctions: (functions: string[]) => void;
  addRunTask: (version: string | "new") => void;
  removeRunTask: (version: string | "new") => void;
  setNewVersionCache: (cache: NewVersionCache) => void;
  updateFunctionModelVersionLists: (
    functionModelUuid: string,
    versionList: any
  ) => void;
  setFocusedEditor: (editor: editor.ICodeEditor | null) => void;
  setShowSlashOptions: (show: boolean) => void;
};

export const useFunctionModelVersionStore = create<Store & Actions>((set) => ({
  isCreateVariantOpen: false,
  fullScreenRunVersionUuid: null,
  selectedFunctionModelVersion: null,
  runLogs: {},
  prompts: {},
  modifiedPrompts: [],
  selectedModel: "gpt-3.5-turbo",
  outputKeys: [],
  selectedParser: null,
  selectedSample: null,
  selectedFunctions: [],
  runTasksCount: {},
  newVersionCache: null,
  functionModelVersionLists: {},
  focusedEditor: null,
  showSlashOptions: false,
  setIsCreateVariantOpen: (isOpen) => set({ isCreateVariantOpen: isOpen }),
  setFullScreenRunVersionUuid: (version) =>
    set({ fullScreenRunVersionUuid: version }),
  setSelectedFunctionModelVersion: (version) =>
    set({ selectedFunctionModelVersion: version }),
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
  setModifiedPrompts: (prompts) => set({ modifiedPrompts: prompts }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setOutputKeys: (keys) => set({ outputKeys: keys }),
  setSelectedParser: (parser) => set({ selectedParser: parser }),
  setSelectedSample: (sample) => set({ selectedSample: sample }),
  setSelectedFunctions: (functions) => set({ selectedFunctions: functions }),
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
  setNewVersionCache: (cache) => set({ newVersionCache: cache }),
  updateFunctionModelVersionLists: (functionModelUuid, versionList) =>
    set((state) => ({
      functionModelVersionLists: {
        ...state.functionModelVersionLists,
        [functionModelUuid]: versionList,
      },
    })),
  setFocusedEditor: (editor) => set({ focusedEditor: editor }),
  setShowSlashOptions: (show) => set({ showSlashOptions: show }),
}));
