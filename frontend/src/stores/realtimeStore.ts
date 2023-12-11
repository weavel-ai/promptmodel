import { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";

// Zustand store
type Store = {
  projectStream: RealtimeChannel;
  functionModelStream: RealtimeChannel;
  chatModelStream: RealtimeChannel;
  functionStream: RealtimeChannel;
  sampleInputStream: RealtimeChannel;
};

type Actions = {
  setProjectStream: (projectStream: RealtimeChannel) => void;
  setFunctionModelStream: (functionModelStream: RealtimeChannel) => void;
  setChatModelStream: (chatModelStream: RealtimeChannel) => void;
  setFunctionStream: (functionStream: RealtimeChannel) => void;
  setSampleInputStream: (sampleInputStream: RealtimeChannel) => void;
};

export const useRealtimeStore = create<Store & Actions>((set) => ({
  projectStream: null,
  functionModelStream: null,
  chatModelStream: null,
  functionStream: null,
  sampleInputStream: null,
  setProjectStream: (projectStream) => set({ projectStream: projectStream }),
  setFunctionModelStream: (functionModelStream) =>
    set({ functionModelStream: functionModelStream }),
  setChatModelStream: (chatModelStream) =>
    set({ chatModelStream: chatModelStream }),
  setFunctionStream: (functionStream) =>
    set({ functionStream: functionStream }),
  setSampleInputStream: (sampleInputStream) =>
    set({ sampleInputStream: sampleInputStream }),
}));
