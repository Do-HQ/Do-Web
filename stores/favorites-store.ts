import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { AppFavoriteItem } from "@/types/favorite";
import useWorkspaceStore from "@/stores/workspace";

type FavoriteDraft = Omit<AppFavoriteItem, "createdAt"> & {
  createdAt?: number;
};

type FavoritesStore = {
  activeWorkspaceKey: string;
  favoritesByWorkspace: Record<string, AppFavoriteItem[]>;
  favorites: AppFavoriteItem[];
  setWorkspaceScope: (workspaceId: string | null | undefined) => void;
  addFavorite: (item: FavoriteDraft) => void;
  removeFavorite: (key: string) => void;
  toggleFavorite: (item: FavoriteDraft) => void;
  isFavorite: (key: string) => boolean;
  clearFavorites: () => void;
};

const MAX_STORED_FAVORITES = 250;
const DEFAULT_WORKSPACE_SCOPE = "__global__";

const toWorkspaceScopeKey = (workspaceId?: string | null) => {
  const normalized = String(workspaceId || "").trim();
  return normalized || DEFAULT_WORKSPACE_SCOPE;
};

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      activeWorkspaceKey: DEFAULT_WORKSPACE_SCOPE,
      favoritesByWorkspace: {},
      favorites: [],
      setWorkspaceScope: (workspaceId) =>
        set((state) => {
          const scopeKey = toWorkspaceScopeKey(workspaceId);
          return {
            activeWorkspaceKey: scopeKey,
            favorites: state.favoritesByWorkspace[scopeKey] || [],
          };
        }),
      addFavorite: (item) =>
        set((state) => {
          const key = String(item.key || "").trim();
          const label = String(item.label || "").trim();
          const href = String(item.href || "").trim();

          if (!key || !label || !href) {
            return state;
          }

          const nextItem: AppFavoriteItem = {
            ...item,
            key,
            label,
            href,
            createdAt: item.createdAt ?? Date.now(),
          };

          const scopeKey = toWorkspaceScopeKey(
            useWorkspaceStore.getState().workspaceId,
          );
          const currentFavorites = state.favoritesByWorkspace[scopeKey] || [];
          const withoutCurrent = currentFavorites.filter(
            (favorite) => favorite.key !== key,
          );
          const nextFavorites = [
            nextItem,
            ...withoutCurrent,
          ].slice(0, MAX_STORED_FAVORITES);
          const nextFavoritesByWorkspace = {
            ...state.favoritesByWorkspace,
            [scopeKey]: nextFavorites,
          };

          return {
            activeWorkspaceKey: scopeKey,
            favoritesByWorkspace: nextFavoritesByWorkspace,
            favorites: nextFavorites,
          };
        }),
      removeFavorite: (key) =>
        set((state) => {
          const normalizedKey = String(key || "").trim();
          const scopeKey = toWorkspaceScopeKey(
            useWorkspaceStore.getState().workspaceId,
          );
          const currentFavorites = state.favoritesByWorkspace[scopeKey] || [];
          const nextFavorites = currentFavorites.filter(
            (favorite) => favorite.key !== normalizedKey,
          );

          return {
            activeWorkspaceKey: scopeKey,
            favoritesByWorkspace: {
              ...state.favoritesByWorkspace,
              [scopeKey]: nextFavorites,
            },
            favorites: nextFavorites,
          };
        }),
      toggleFavorite: (item) => {
        const key = String(item.key || "").trim();
        if (!key) {
          return;
        }

        if (get().isFavorite(key)) {
          get().removeFavorite(key);
          return;
        }

        get().addFavorite(item);
      },
      isFavorite: (key) => {
        const normalizedKey = String(key || "").trim();
        const scopeKey = toWorkspaceScopeKey(
          useWorkspaceStore.getState().workspaceId,
        );
        const scopedFavorites = get().favoritesByWorkspace[scopeKey] || [];
        return scopedFavorites.some((favorite) => favorite.key === normalizedKey);
      },
      clearFavorites: () =>
        set((state) => {
          const scopeKey = toWorkspaceScopeKey(
            useWorkspaceStore.getState().workspaceId,
          );
          return {
            activeWorkspaceKey: scopeKey,
            favoritesByWorkspace: {
              ...state.favoritesByWorkspace,
              [scopeKey]: [],
            },
            favorites: [],
          };
        }),
    }),
    {
      name: "app-favorites-v2",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState || {}) as {
          favorites?: AppFavoriteItem[];
          favoritesByWorkspace?: Record<string, AppFavoriteItem[]>;
          activeWorkspaceKey?: string;
        };

        if (state.favoritesByWorkspace) {
          const activeWorkspaceKey = toWorkspaceScopeKey(
            state.activeWorkspaceKey,
          );
          return {
            ...state,
            activeWorkspaceKey,
            favorites: state.favoritesByWorkspace[activeWorkspaceKey] || [],
          };
        }

        const legacyFavorites = Array.isArray(state.favorites)
          ? state.favorites
          : [];
        return {
          activeWorkspaceKey: DEFAULT_WORKSPACE_SCOPE,
          favoritesByWorkspace: {
            [DEFAULT_WORKSPACE_SCOPE]: legacyFavorites,
          },
          favorites: legacyFavorites,
        };
      },
      partialize: (state) => ({
        activeWorkspaceKey: state.activeWorkspaceKey,
        favoritesByWorkspace: state.favoritesByWorkspace,
      }),
    },
  ),
);
