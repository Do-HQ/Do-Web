import { create } from "zustand";

interface WorkspaceStoreTypes {
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string | null) => void;
}

const useWorkspaceStore = create<WorkspaceStoreTypes>((set) => ({
  workspaceId: null,
  setWorkspaceId: (workspaceId: string | null) =>
    set({
      workspaceId,
    }),
}));

export default useWorkspaceStore;
