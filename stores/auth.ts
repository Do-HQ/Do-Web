import { AuthUser, UserType } from "@/types/auth";
import { create } from "zustand";

interface useAuthStoreTypes {
  user: AuthUser | null;
  setUser: (user: Partial<AuthUser>) => void;
}

const useAuthStore = create<useAuthStoreTypes>((set) => ({
  user: null,
  setUser: (user) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : (user as AuthUser),
    })),
}));

export default useAuthStore;
