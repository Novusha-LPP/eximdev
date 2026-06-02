import React, { useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../../styles/sidebar.scss";
import { Avatar, IconButton, ListItemButton, Tooltip, Badge, Typography, Box } from "@mui/material";
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
import CampaignIcon from "@mui/icons-material/Campaign";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import { UserContext } from "../../contexts/UserContext";
import { useLayoutConfig } from "../../contexts/LayoutConfigContext.js";
import CurrencyRateDialog from "./CurrencyRateDialog";

function Sidebar({ drawerWidth = 60 }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, setUser } = useContext(UserContext);
  const { layoutConfig } = useLayoutConfig();
  const sidebarConfig = layoutConfig?.sidebar || {};
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);

  const isWide = drawerWidth > 80 || sidebarConfig.mode === "icon-label";

  // Dynamic colors from config
  const iconColor = sidebarConfig.iconColor || "#ffffff9f";
  const activeColor = sidebarConfig.activeItemColor || "#ffffff";
  const hoverColor = sidebarConfig.hoverColor || "#ffffff";
  const hoverBgColor = sidebarConfig.hoverBgColor || "rgba(255,255,255,0.08)";
  const itemSpacing = sidebarConfig.itemSpacing || 0;

  const clearClientAuthData = () => {
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
      console.warn("Server logout failed, continuing with local cleanup.", error);
    } finally {
      clearClientAuthData();
      setUser(null);
      navigate("/");
    }
  };

  // Helper to determine if a route is active
  const isActive = (route) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route);
  };

  // Shared styles for nav items
  const getItemStyles = (route) => {
    const active = isActive(route);
    return {
      py: isWide ? 1 : 0.5,
      px: isWide ? 1.5 : 0,
      mb: itemSpacing / 8,
      borderRadius: isWide ? 2 : 0,
      justifyContent: isWide ? "flex-start" : "center",
      bgcolor: active ? hoverBgColor : "transparent",
      color: active ? activeColor : iconColor,
      transition: "all 0.2s ease",
      "&:hover": {
        bgcolor: hoverBgColor,
        color: hoverColor,
      },
    };
  };

  const iconStyles = (route) => ({
    color: isActive(route) ? activeColor : iconColor,
    transition: "color 0.2s ease",
  });

  // Reusable nav item renderer
  const NavItem = ({ route, title, icon: Icon, onClick, condition = true }) => {
    if (!condition) return null;
    const handleClick = onClick || (() => navigate(route));
    const content = (
      <ListItemButton
        className="appbar-links"
        aria-label="list-item"
        onClick={handleClick}
        sx={getItemStyles(route)}
      >
        <IconButton
          sx={{
            color: iconStyles(route).color,
            mr: isWide ? 1.5 : 0,
            p: isWide ? 0.5 : 1,
          }}
          aria-label="icon"
        >
          <Icon />
        </IconButton>
        {isWide && (
          <Typography
            variant="body2"
            sx={{
              fontWeight: isActive(route) ? 600 : 400,
              fontSize: "0.85rem",
              color: isActive(route) ? activeColor : iconColor,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </Typography>
        )}
      </ListItemButton>
    );

    if (isWide) return content;
    return (
      <Tooltip title={title} enterDelay={0} placement="right">
        {content}
      </Tooltip>
    );
  };

  return (
    <div className="sidebar" style={{ alignItems: isWide ? "stretch" : "center", px: isWide ? 1 : 0 }}>
      {/* User Avatar */}
      <Tooltip title={`Welcome ${user.first_name}`} enterDelay={0} placement="right">
        <IconButton
          onClick={() => navigate(`/profile/${user.username}`)}
          sx={{ alignSelf: isWide ? "flex-start" : "center", ml: isWide ? 1 : 0, mb: 1 }}
        >
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              user.is_verified ? (
                <VerifiedIcon
                  sx={{
                    color: "#1d9bf0 !important",
                    fontSize: "0.9rem",
                    bgcolor: "white",
                    borderRadius: "50%",
                  }}
                />
              ) : null
            }
          >
            <Avatar src={user.employee_photo} alt="Employee Photo" />
          </Badge>
        </IconButton>
      </Tooltip>

      {isWide && (
        <Typography
          variant="caption"
          sx={{
            color: iconColor,
            px: 1.5,
            mb: 1,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user.first_name} {user.last_name}
        </Typography>
      )}

      <Box sx={{ width: "100%", flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <NavItem route="/" title="Home" icon={HomeRoundedIcon} />

        {user.role === "Admin" && (
          <>
            <NavItem route="/assign" title="Admin" icon={AssignmentIndIcon} />
            <NavItem route="/admin/branches" title="Branch Management" icon={DomainIcon} />
            <NavItem route="/admin/api-keys" title="API Key Management" icon={VpnKeyIcon} />
            <NavItem route="/admin/job-migration" title="Job Migration Utility" icon={SwapHorizIcon} />
            <NavItem route="/admin/layout-studio" title="Layout Studio" icon={DashboardCustomizeIcon} />
          </>
        )}

        {user.role === "Head_of_Department" && (
          <NavItem route="/hod-management" title="HoD - Team Management" icon={SupervisedUserCircleIcon} />
        )}

        <NavItem
          route="#"
          title="Currency Exchange Rates"
          icon={CurrencyExchangeIcon}
          onClick={() => setCurrencyDialogOpen(true)}
        />

        {['suraj_rajan', 'uday_zope', 'geethanjali_b'].includes(user.username) && (
          <NavItem route="/project-nucleus" title="Project Nucleus" icon={HubIcon} />
        )}

        <NavItem route="/release-notes" title="Release Notes" icon={DescriptionIcon} />
        <NavItem route="/feedback" title="Feedback" icon={FeedbackIcon} />
        <NavItem route="/change-password" title="Change Password" icon={LockResetIcon} />
        <NavItem route="#" title="Logout" icon={LogoutRoundedIcon} onClick={handleLogout} />
      </Box>

      {/* Currency Rate Dialog */}
      <CurrencyRateDialog
        open={currencyDialogOpen}
        onClose={() => setCurrencyDialogOpen(false)}
      />
    </div>
  );
}

export default React.memo(Sidebar);
