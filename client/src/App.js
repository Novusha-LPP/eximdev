import "./App.scss";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import { getUser } from "./utils/cookie";

function App() {
  // const [user, setUser] = useState(
  //   JSON.parse(localStorage.getItem("exim_user"))
  // );

  // const [user, setUser] = useState(() => {
  //   // 1. Get the raw cookie value (e.g. a JSON string like {"username":"John","role":"admin"})
  //   const cookieValue = getCookieValue("exim_user");

  //   if (!cookieValue) {
  //     // If the cookie doesn’t exist, return null (logged out)
  //     return null;
  //   }

  //   // 2. Attempt to parse it as JSON
  //   try {
  //     return JSON.parse(cookieValue);
  //   } catch (error) {
  //     console.error("Failed to parse exim_user cookie:", error);
  //     return null;
  //   }
  // });
  const [user, setUser] = useState(() => getUser());
  console.log(user);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlShiftLeftArrow =
        event.ctrlKey && event.shiftKey && event.key === "ArrowLeft" && !isMac;
      const cmdShiftLeftArrow =
        event.metaKey && event.shiftKey && event.key === "ArrowLeft" && isMac;
      const ctrlShiftRightArrow =
        event.ctrlKey && event.shiftKey && event.key === "ArrowRight" && !isMac;
      const cmdShiftRightArrow =
        event.metaKey && event.shiftKey && event.key === "ArrowRight" && isMac;

      if (ctrlShiftLeftArrow || cmdShiftLeftArrow) {
        navigate(-1); // Go back to the previous page
      } else if (ctrlShiftRightArrow || cmdShiftRightArrow) {
        navigate(1); // Go forward to the next page
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="App">{user ? <HomePage /> : <LoginPage />}</div>
    </UserContext.Provider>
  );
}

export default React.memo(App);
