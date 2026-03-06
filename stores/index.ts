import { create } from "zustand";

import { useProjectStore } from "./project-store";

interface AppStore {
  showSpotlightSearch: boolean;
  setShowSpotlightSearch: (showSpotlightSearch: boolean) => void;
  showSettings: boolean;
  setShowSettings: (showSpotlightSearch: boolean) => void;
  activeSetting: string;
  setActiveSetting: (activeSetting: string) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  showSpotlightSearch: false,
  setShowSpotlightSearch: (showSpotlightSearch: boolean) =>
    set({ showSpotlightSearch }),
  showSettings: false,
  setShowSettings: (showSettings: boolean) => set({ showSettings }),
  activeSetting: "profile",
  setActiveSetting: (activeSetting: string) => set({ activeSetting }),
}));

export { useProjectStore };
