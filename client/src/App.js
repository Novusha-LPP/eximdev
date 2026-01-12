import "./App.scss";
import "./styles/job-details.scss";
import axios from "axios";
import { UserContext } from "./contexts/UserContext";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";

// Add axios interceptor for branch context
axios.interceptors.request.use((config) => {
  let selectedBranch = localStorage.getItem("selected_branch") || "AHMEDABAD HO";
  if (selectedBranch === "Main Branch") selectedBranch = "AHMEDABAD HO";
  if (selectedBranch === "Gandhidham" || selectedBranch === "Gandhidham Branch") selectedBranch = "GANDHIDHAM";
  config.headers["x-branch"] = selectedBranch;
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/me`, { withCredentials: true });
        setUser(res.data);
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

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
        navigate(-1);
      } else if (ctrlShiftRightArrow || cmdShiftRightArrow) {
        navigate(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("exim_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("exim_user");
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="App">{user ? <HomePage /> : <LoginPage />}</div>
    </UserContext.Provider>
  );
}

export default React.memo(App);
