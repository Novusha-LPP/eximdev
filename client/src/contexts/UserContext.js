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

export const UserProvider = ({ children }) => {
  // We don't need the authentication check here anymore
  // since it's being handled in App.js
  
  const logout = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/api/logout`,
        {},
        {
          withCredentials: true,
        }
      );
      // The App component will update user state
      window.location.href = "/"; // Force a full page reload
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // We're not providing user and setUser here anymore
  // as they'll be provided through App.js
  return (
    <UserContext.Provider value={{ logout }}>
      {children}
    </UserContext.Provider>
  );
};