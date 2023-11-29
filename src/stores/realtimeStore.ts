import { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";

// Zustand store
type Store = {
  projectStream: RealtimeChannel;
  promptModelStream: RealtimeChannel;
  chatModelStream: RealtimeChannel;
  functionStream: RealtimeChannel;
};

type Actions = {
  setProjectStream: (projectStream: RealtimeChannel) => void;
  setPromptModelStream: (promptModelStream: RealtimeChannel) => void;
  setChatModelStream: (chatModelStream: RealtimeChannel) => void;
  setFunctionStream: (functionStream: RealtimeChannel) => void;
};

export const useRealtimeStore = create<Store & Actions>((set) => ({
  projectStream: null,
  promptModelStream: null,
  chatModelStream: null,
  functionStream: null,
  setProjectStream: (projectStream) => set({ projectStream: projectStream }),
  setPromptModelStream: (promptModelStream) =>
    set({ promptModelStream: promptModelStream }),
  setChatModelStream: (chatModelStream) =>
    set({ chatModelStream: chatModelStream }),
  setFunctionStream: (functionStream) =>
    set({ functionStream: functionStream }),
}));
