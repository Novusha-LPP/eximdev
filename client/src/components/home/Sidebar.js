import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../styles/sidebar.scss";
import { Avatar, IconButton, ListItemButton, Tooltip, Badge } from "@mui/material";
import VerifiedIcon from "@mui/icons-material/Verified";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import FeedbackIcon from "@mui/icons-material/Feedback";
import LockResetIcon from "@mui/icons-material/LockReset";
import DescriptionIcon from "@mui/icons-material/Description";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import InsightsIcon from "@mui/icons-material/Insights";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HubIcon from "@mui/icons-material/Hub";
import SupervisedUserCircleIcon from "@mui/icons-material/SupervisedUserCircle";
import DomainIcon from "@mui/icons-material/Domain";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import { UserContext } from "../../contexts/UserContext";
import CurrencyRateDialog from "./CurrencyRateDialog"; // Import the dialog

function Sidebar() {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchCount = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/attendance/correction-notifications/count`,
          { withCredentials: true }
        );
        if (response.data && typeof response.data.count === 'number') {
          setPendingCorrectionCount(response.data.count);
        }
      } catch (error) {
        console.error("Failed to fetch pending correction count:", error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const clearClientAuthData = () => {
    // Remove user/auth-related client state from storage.
    [
      "exim_user",
      "user",
      "username",
      "userId",
      "userRole",
      "selected_importer",
      "selected_importer_url",
      "tab_value",
    ].forEach((key) => localStorage.removeItem(key));

    // Remove all non-HttpOnly cookies available to JS.
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    });
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${process.env.REACT_APP_API_STRING}/logout`, {}, { withCredentials: true });
    } catch (error) {
      // Proceed with client cleanup even if server logout call fails.
      console.warn("Server logout failed, continuing with local cleanup.", error);
    } finally {
      clearClientAuthData();
      setUser(null);
      navigate("/");
    }
  };

  return (
    <div className="sidebar">
      <Tooltip
        title={user?.achievement_tag ? `🌟 ${user.achievement_tag} — ${user.first_name}` : `Welcome ${user.first_name}`}
        enterDelay={0}
        placement="right"
      >
        <IconButton onClick={() => navigate(`/profile/${user.username}`)}>
          {(() => {
            const getSidebarRing = (tag) => {
              switch (tag) {
                case 'Best Employee of the Month':
                  return { ring: '0 0 0 3px #f59e0b, 0 0 12px rgba(245, 158, 11, 0.55)', icon: '🌟', badgeBg: 'linear-gradient(135deg, #f59e0b, #d97706)', title: 'Best Employee of the Month' };
                case 'Best QC Inspector':
                  return { ring: '0 0 0 3px #06b6d4, 0 0 12px rgba(6, 182, 212, 0.55)', icon: '🔍', badgeBg: 'linear-gradient(135deg, #06b6d4, #0891b2)', title: 'Best QC Inspector' };
                case 'Best 5s Zone':
                  return { ring: '0 0 0 3px #10b981, 0 0 12px rgba(16, 185, 129, 0.55)', icon: '🏆', badgeBg: 'linear-gradient(135deg, #10b981, #059669)', title: 'Best 5s Zone' };
                case 'Best Operator':
                  return { ring: '0 0 0 3px #6366f1, 0 0 12px rgba(99, 102, 241, 0.55)', icon: '⚙️', badgeBg: 'linear-gradient(135deg, #6366f1, #4f46e5)', title: 'Best Operator' };
                default:
                  return null;
              }
            };
            const ringCfg = getSidebarRing(user?.achievement_tag);
            return (
              <div style={{ position: 'relative' }}>
                <Avatar
                  src={user.employee_photo}
                  alt="Employee Photo"
                  sx={{
                    boxShadow: ringCfg ? ringCfg.ring : 'none',
                    border: ringCfg ? '2px solid #fff' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                />
                {ringCfg ? (
                  <span
                    title={ringCfg.title}
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: ringCfg.badgeBg,
                      border: '1.5px solid #fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9.5px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      zIndex: 3
                    }}
                  >
                    {ringCfg.icon}
                  </span>
                ) : user.is_verified ? (
                  <VerifiedIcon
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      color: "#1d9bf0 !important",
                      fontSize: "0.9rem",
                      bgcolor: "white",
                      borderRadius: "50%",
                    }}
                  />
                ) : null}
              </div>
            );
          })()}
        </IconButton>
      </Tooltip>

      <Tooltip title="Home" enterDelay={0} placement="right">
        <ListItemButton
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <HomeRoundedIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      {true && (
        <>
          <Tooltip title="Attendance" enterDelay={0} placement="right">
            <ListItemButton
              className="appbar-links"
              aria-label="list-item"
              onClick={() => navigate("/attendance/dashboard")}
            >
              <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                <Badge badgeContent={pendingCorrectionCount} color="error">
                  <AccessTimeIcon />
                </Badge>
              </IconButton>
            </ListItemButton>
          </Tooltip>

          {(() => {
            const isRabs = user?.company && /RABS/i.test(user.company);
            const isAdminOrHod = user?.role === "Admin" || user?.role === "Head_of_Department" || user?.role === "HOD" || user?.isHOD;
            return isRabs && isAdminOrHod;
          })() && (
            <Tooltip title="5S Audit" enterDelay={0} placement="right">
              <ListItemButton
                className="appbar-links"
                aria-label="list-item"
                onClick={() => navigate("/audit-5s")}
              >
                <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                  <FactCheckIcon />
                </IconButton>
              </ListItemButton>
            </Tooltip>
          )}

          {(() => {
            const isRabs = user?.company && /RABS/i.test(user.company);
            const isAdminOrHod = user?.role === "Admin" || user?.role === "Head_of_Department" || user?.role === "HOD" || user?.isHOD;
            return isRabs && isAdminOrHod;
          })() && (
            <Tooltip title="First Aid Kit" enterDelay={0} placement="right">
              <ListItemButton
                className="appbar-links"
                aria-label="list-item"
                onClick={() => navigate("/first-aid")}
              >
                <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                  <MedicalServicesIcon />
                </IconButton>
              </ListItemButton>
            </Tooltip>
          )}
        </>
      )}

      {user.role === "Admin" && (
        <>
          <Tooltip title="Admin" enterDelay={0} placement="right">
            <ListItemButton
              className="appbar-links"
              aria-label="list-item"
              onClick={() => navigate("/assign")}
            >
              <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                <AssignmentIndIcon />
              </IconButton>
            </ListItemButton>
          </Tooltip>

          <Tooltip title="Branch Management" enterDelay={0} placement="right">
            <ListItemButton
              className="appbar-links"
              aria-label="list-item"
              onClick={() => navigate("/admin/branches")}
            >
              <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                <DomainIcon />
              </IconButton>
            </ListItemButton>
          </Tooltip>

          <Tooltip title="API Key Management" enterDelay={0} placement="right">
            <ListItemButton
              className="appbar-links"
              aria-label="list-item"
              onClick={() => navigate("/admin/api-keys")}
            >
              <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                <VpnKeyIcon />
              </IconButton>
            </ListItemButton>
          </Tooltip>

          <Tooltip title="Job Migration Utility" enterDelay={0} placement="right">
            <ListItemButton
              className="appbar-links"
              aria-label="list-item"
              onClick={() => navigate("/admin/job-migration")}
            >
              <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                <SwapHorizIcon />
              </IconButton>
            </ListItemButton>
          </Tooltip>
        </>
      )}

      {/* HOD Management - For Head of Department users */}
      {user.role === "Head_of_Department" && (
        <Tooltip title="HoD - Team Management" enterDelay={0} placement="right">
          <ListItemButton
            className="appbar-links"
            aria-label="list-item"
            onClick={() => navigate("/hod-management")}
          >
            <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
              <SupervisedUserCircleIcon />
            </IconButton>
          </ListItemButton>
        </Tooltip>
      )}

      {/* NEW: Currency Exchange Rates Icon */}
      <Tooltip title="Currency Exchange Rates" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => setCurrencyDialogOpen(true)}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <CurrencyExchangeIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>




      {
        ['suraj_rajan', 'uday_zope', 'geethanjali_b', 'masood_raza'].includes(user.username) && (
          <Tooltip title="Project Nucleus" enterDelay={0} placement="right">
            <ListItemButton
              className="appbar-links"
              aria-label="list-item"
              onClick={() => navigate("/project-nucleus")}
            >
              <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
                <HubIcon />
              </IconButton>
            </ListItemButton>
          </Tooltip>
        )
      }

      <Tooltip title="Release Notes" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/release-notes")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <DescriptionIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      <Tooltip title="Feedback" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/feedback")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <FeedbackIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      <Tooltip title="Change Password" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={() => navigate("/change-password")}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <LockResetIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      <Tooltip title="Logout" enterDelay={0} placement="right">
        <ListItemButton
          sx={{ textAlign: "left" }}
          className="appbar-links"
          aria-label="list-item"
          onClick={handleLogout}
        >
          <IconButton sx={{ color: "#ffffff9f" }} aria-label="icon">
            <LogoutRoundedIcon />
          </IconButton>
        </ListItemButton>
      </Tooltip>

      {/* Currency Rate Dialog */}
      <CurrencyRateDialog
        open={currencyDialogOpen}
        onClose={() => setCurrencyDialogOpen(false)}
      />
    </div>
  );
}

export default React.memo(Sidebar);
