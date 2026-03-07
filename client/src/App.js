import "./App.scss";
import "./styles/job-details.scss";
import axios from "axios";
import { UserContext } from "./contexts/UserContext";
import { BranchProvider, BranchContext } from "./contexts/BranchContext";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import LoadingOverlay from "./components/common/LoadingOverlay";

// Inner component to access BranchContext for the loading overlay
const AppContent = ({ user }) => {
  const { isSwitching } = useContext(BranchContext);

  return (
    <>
      <div className="App">{user ? <HomePage /> : <LoginPage />}</div>
      <LoadingOverlay isVisible={isSwitching} message="Switching Branch..." />
    </>
  );
};

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

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <BranchProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          {loading ? (
            <LoadingOverlay isVisible={true} message="Loading Alvision Pulse..." />
          ) : (
            <AppContent user={user} />
          )}
        </LocalizationProvider>
      </BranchProvider>
    </UserContext.Provider>
  );
}

export default React.memo(App);

