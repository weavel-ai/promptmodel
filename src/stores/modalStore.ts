import { create } from "zustand";

// Zustand store
type Store = {
  backdropOpen: boolean;
};

type Actions = {
  setBackdropOpen: (backdropOpen: boolean) => void;
};

export const useModalStore = create<Store & Actions>((set) => ({
  backdropOpen: false,
  setBackdropOpen: (backdropOpen) => set({ backdropOpen: backdropOpen }),
}));
