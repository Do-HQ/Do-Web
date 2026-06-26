import { create } from "zustand";

import { useFavoritesStore } from "./favorites-store";
import { useProjectStore } from "./project-store";

interface AppStore {
  showSpotlightSearch: boolean;
  setShowSpotlightSearch: (showSpotlightSearch: boolean) => void;
  showAiAssistantOverlay: boolean;
  setShowAiAssistantOverlay: (showAiAssistantOverlay: boolean) => void;
  showScribeWidget: boolean;
  setShowScribeWidget: (showScribeWidget: boolean) => void;
  scribeWidgetPinned: boolean;
  setScribeWidgetPinned: (scribeWidgetPinned: boolean) => void;
  showSettings: boolean;
  setShowSettings: (showSpotlightSearch: boolean) => void;
  activeSetting: string;
  setActiveSetting: (activeSetting: string) => void;
  spacesUnread: number;
  jamsUnread: number;
  incrementSpacesUnread: () => void;
  incrementJamsUnread: () => void;
  clearSpacesUnread: () => void;
  clearJamsUnread: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  showSpotlightSearch: false,
  setShowSpotlightSearch: (showSpotlightSearch: boolean) =>
    set({ showSpotlightSearch }),
  showAiAssistantOverlay: false,
  setShowAiAssistantOverlay: (showAiAssistantOverlay: boolean) =>
    set({ showAiAssistantOverlay }),
  showScribeWidget: false,
  setShowScribeWidget: (showScribeWidget: boolean) =>
    set({ showScribeWidget }),
  scribeWidgetPinned: false,
  setScribeWidgetPinned: (scribeWidgetPinned: boolean) =>
    set({ scribeWidgetPinned, showScribeWidget: true }),
  showSettings: false,
  setShowSettings: (showSettings: boolean) => set({ showSettings }),
  activeSetting: "profile",
  setActiveSetting: (activeSetting: string) => set({ activeSetting }),
  spacesUnread: 0,
  jamsUnread: 0,
  incrementSpacesUnread: () => set((s) => ({ spacesUnread: s.spacesUnread + 1 })),
  incrementJamsUnread: () => set((s) => ({ jamsUnread: s.jamsUnread + 1 })),
  clearSpacesUnread: () => set({ spacesUnread: 0 }),
  clearJamsUnread: () => set({ jamsUnread: 0 }),
}));

export { useFavoritesStore, useProjectStore };
