
import "./App.scss";
import "./styles/job-details.scss";
import axios from "axios";
import { UserContext } from "./contexts/UserContext";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import React, { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AmcPublicForm from "./pages/AmcPublicForm";
import ItHelpdeskPage from "./pages/ItHelpdeskPage";
import { AuditLogProvider } from "./components/it-helpdesk/AuditLogs";
import { itHelpdeskAPI } from "./api/itHelpdeskAPI";

import { Toaster } from "react-hot-toast";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("exim_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
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

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <AuditLogProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <div className="App">
            <Routes>
              <Route path="/amc-entry" element={<AmcPublicForm />} />
              <Route path="*" element={user ? <HomePage /> : <LoginPage />} />
            </Routes>
          </div>
        </LocalizationProvider>
      </AuditLogProvider>
    </UserContext.Provider>
  );
}

export default React.memo(App);
