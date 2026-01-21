import { create } from "zustand";

interface useAuthStoreTypes {
  user: null;
  setUser: (user: null) => void;
}

const useAuthStore = create<useAuthStoreTypes>((set) => ({
  user: null,
  setUser: () => set((state) => ({ user: state.user })),
}));

export default useAuthStore;
