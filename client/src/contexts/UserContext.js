import React, { createContext, useContext } from "react";
import axios from "axios";

export const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider = ({ children, userValue }) => {
  return (
    <UserContext.Provider value={userValue}>{children}</UserContext.Provider>
  );
};
