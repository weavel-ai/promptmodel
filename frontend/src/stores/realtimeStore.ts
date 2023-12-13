import { create } from "zustand";

// Zustand store
type Store = {
  projectStream: WebSocket;
  functionModelStream: WebSocket;
  chatModelStream: WebSocket;
  functionStream: WebSocket;
  sampleInputStream: WebSocket;
};

type Actions = {
  setProjectStream: (projectStream: WebSocket) => void;
  setFunctionModelStream: (functionModelStream: WebSocket) => void;
  setChatModelStream: (chatModelStream: WebSocket) => void;
  setFunctionStream: (functionStream: WebSocket) => void;
  setSampleInputStream: (sampleInputStream: WebSocket) => void;
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
