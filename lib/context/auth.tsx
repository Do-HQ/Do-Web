import React, { createContext } from "react";

interface Props {
  children: React.ReactNode;
}

interface Values {
  getUser: () => void;
}

export const AuthContext = createContext({} as Values);

const AuthContextProvider = ({ children }: Props) => {
  // Handlers
  const getUser = () => {};

  return (
    <AuthContext.Provider value={{ getUser }}>{children}</AuthContext.Provider>
  );
};

export default AuthContextProvider;
