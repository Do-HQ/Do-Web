import { create } from "zustand";

interface AppStore {
  showSpotlightSearch: boolean;
  setShowSpotlightSearch: (showSpotlightSearch: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  showSpotlightSearch: false,
  setShowSpotlightSearch: (showSpotlightSearch: boolean) =>
    set({ showSpotlightSearch }),
}));
