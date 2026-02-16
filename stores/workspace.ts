import { WorkspaceType } from "@/types/workspace";
import { create } from "zustand";

interface WorkspaceStoreTypes {
  workspaceId: string | null;
  setWorkspaceId: (workspaceId: string | null) => void;
  workspaces: WorkspaceType[];
  setWorkspaces: (workspaces: WorkspaceType[]) => void;
}

const useWorkspaceStore = create<WorkspaceStoreTypes>((set) => ({
  workspaceId: null,
  setWorkspaceId: (workspaceId: string | null) =>
    set({
      workspaceId,
    }),
  workspaces: [],
  setWorkspaces: (workspaces: WorkspaceType[]) =>
    set({
      workspaces,
    }),
}));

export default useWorkspaceStore;
