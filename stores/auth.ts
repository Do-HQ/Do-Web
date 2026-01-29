import { UserType } from "@/types/auth";
import { create } from "zustand";

interface useAuthStoreTypes {
  user: UserType | null;
  setUser: (user: Partial<UserType>) => void;
}

const useAuthStore = create<useAuthStoreTypes>((set) => ({
  user: null,
  setUser: (user) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...user } : (user as UserType),
    })),
}));

export default useAuthStore;
