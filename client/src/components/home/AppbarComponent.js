import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Badge,
  Tooltip,
} from "@mui/material";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import axios from "axios";
import { useEffect, useState, useContext, useMemo } from "react";
import { BranchContext } from "../../contexts/BranchContext.js";
import { useLayoutConfig } from "../../contexts/LayoutConfigContext.js";
import NavbarPromoBanner from "./NavbarPromoBanner";

// MUI icon mapping for dynamic extra content
import * as MuiIcons from "@mui/icons-material";

function AppbarComponent(props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const {
    selectedBranchGroup,
    setSelectedBranchGroup,
    selectedCategory,
    setSelectedCategory,
    branches,
    isAdmin,
  } = useContext(BranchContext);

  const { layoutConfig } = useLayoutConfig();
  const appbarConfig = layoutConfig?.appbar || {};
  const sidebarConfig = layoutConfig?.sidebar || {};

  const [bannerHeight, setBannerHeight] = useState(0);

  useEffect(() => {
    document.documentElement.style.setProperty('--navbar-banner-height', `${bannerHeight}px`);
    return () => {
      document.documentElement.style.setProperty('--navbar-banner-height', '0px');
    };
  }, [bannerHeight]);

  // Determine if we are in a job-specific view to disable branch switching
  const isJobView = useMemo(() => {
    return pathname.includes('/job/') || 
           pathname.includes('/edit-do-') || 
           pathname.includes('/edit-billing-') ||
           pathname.includes('/edit-free-days-') ||
           pathname.includes('/view-job/') ||
           pathname.includes('/view-billing-job/') ||
           pathname.includes('/view-payment-request-job/') ||
           pathname.includes('/submission-job/') ||
           pathname.includes('/esanchit-job/') ||
           pathname.includes('/documentationJob/');
  }, [pathname]);

  // Get unique branch locations for the dropdown
  const uniqueBranches = useMemo(() => {
    const seen = new Set();
    const result = [];
    branches.forEach((b) => {
      if (!seen.has(b.branch_code)) {
        seen.add(b.branch_code);
        result.push(b);
      }
    });
    return result;
  }, [branches]);

  const resolvedSelectedBranchGroup = useMemo(() => {
    if (selectedBranchGroup === 'all') return 'all';
    return uniqueBranches.some((b) => b.branch_code === selectedBranchGroup)
      ? selectedBranchGroup
      : 'all';
  }, [selectedBranchGroup, uniqueBranches]);

  // Check which categories are available for the selected branch group
  const availableCategories = useMemo(() => {
    if (selectedBranchGroup === 'all') return ['SEA', 'AIR'];
    return branches
      .filter(b => b.branch_code === selectedBranchGroup)
      .map(b => b.category);
  }, [branches, selectedBranchGroup]);

  // If appbar is disabled, render nothing
  if (appbarConfig.enabled === false) {
    return null;
  }

  const drawerWidth = sidebarConfig.enabled !== false ? (sidebarConfig.width || 60) : 0;

  // Build dynamic AppBar styles from config
  const appbarStyles = {
    width: { lg: `calc(100% - ${drawerWidth}px)` },
    ml: { lg: `${drawerWidth}px` },
    backgroundColor: appbarConfig.backgroundColor || "rgba(249, 250, 251, 0.3)",
    backdropFilter: `blur(${appbarConfig.blurIntensity || 6}px) !important`,
    boxShadow: appbarConfig.shadow || "none",
    borderBottom: appbarConfig.borderBottom || "none",
    color: appbarConfig.textColor || "#000000",
    transition: "all 0.3s ease",
  };

  const toolbarStyles = {
    minHeight: appbarConfig.height || 64,
    height: appbarConfig.height || 64,
    transition: "height 0.3s ease",
  };

  // Helper to render extra content
  const renderExtraContent = (item, index) => {
    const IconComp = MuiIcons[item.icon] || null;
    const key = `extra-${index}`;

    if (item.type === "badge" && IconComp) {
      return (
        <Tooltip key={key} title={item.label || ""}>
          <IconButton
            size="small"
            onClick={() => item.href && navigate(item.href)}
            sx={{ color: appbarConfig.textColor || "#000" }}
          >
            <Badge variant="dot" color="error" invisible={!item.badgeColor}>
              <IconComp sx={{ fontSize: "1.25rem" }} />
            </Badge>
          </IconButton>
        </Tooltip>
      );
    }

    if (item.type === "link" && IconComp) {
      return (
        <Tooltip key={key} title={item.label || ""}>
          <IconButton
            size="small"
            onClick={() => item.href && navigate(item.href)}
            sx={{ color: appbarConfig.textColor || "#000" }}
          >
            <IconComp sx={{ fontSize: "1.25rem" }} />
          </IconButton>
        </Tooltip>
      );
    }

    if (item.type === "text") {
      return (
        <Chip
          key={key}
          label={item.label}
          size="small"
          onClick={() => item.href && navigate(item.href)}
          sx={{
            fontWeight: 600,
            fontSize: "0.75rem",
            cursor: item.href ? "pointer" : "default",
            color: appbarConfig.textColor || "#000",
            borderColor: appbarConfig.textColor || "#000",
          }}
          variant="outlined"
        />
      );
    }

    return null;
  };

  return (
    <>
      {layoutConfig?.customCss && (
        <style dangerouslySetInnerHTML={{ __html: layoutConfig.customCss }} />
      )}
      <AppBar
        id="appbar-main"
        position="fixed"
        sx={appbarStyles}
      >
      <NavbarPromoBanner onHeightChange={setBannerHeight} bannerConfig={layoutConfig?.banner} />
      <Toolbar id="appbar-toolbar" sx={toolbarStyles}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => props.setMobileOpen(!props.mobileOpen)}
          sx={{ mr: 2, display: { lg: "none" }, color: appbarConfig.textColor || "#000" }}
        >
          <MenuIcon sx={{ color: appbarConfig.textColor || "#000" }} />
        </IconButton>

        <IconButton
          color="inherit"
          aria-label="go back"
          edge="start"
          onClick={() => window.history.back()}
          sx={{ mr: 1, color: appbarConfig.textColor || "#000" }}
        >
          <ArrowBackIcon sx={{ color: appbarConfig.textColor || "#000" }} />
        </IconButton>

        <div>
          <img
            src={require("../../assets/images/logo.webp")}
            alt="logo"
            height="50px"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          />
        </div>

        <Box sx={{ flexGrow: 1 }} />

        {/* Global Branch & Category Filter */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mr: 3 }}>
          {/* Branch Selector */}
          <FormControl size="small" variant="outlined" sx={{ minWidth: 150 }}>
            <Select
              value={resolvedSelectedBranchGroup}
              onChange={(e) => setSelectedBranchGroup(e.target.value)}
              displayEmpty
              disabled={isJobView}
              sx={{
                bgcolor: isJobView ? "#f5f5f5" : "white",
                borderRadius: 1,
                color: "#000",
                "& .MuiSelect-select": {
                  color: "#000",
                  py: 1,
                },
                "& .MuiSvgIcon-root": {
                  color: "#000",
                },
                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
              }}
            >
              {(isAdmin || branches.length === 0 || uniqueBranches.length > 1) && (
                <MenuItem value="all">
                  <em>All Branches</em>
                </MenuItem>
              )}
              {uniqueBranches.map((b) => (
                <MenuItem key={b.branch_code} value={b.branch_code}>
                  {b.branch_name} ({b.branch_code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Category Toggle */}
          <ToggleButtonGroup
            value={selectedCategory}
            exclusive
            onChange={(e, next) => next && setSelectedCategory(next)}
            size="small"
            disabled={isJobView}
            sx={{
              bgcolor: isJobView ? "#f5f5f5" : "white",
              borderRadius: 1,
              height: "40px",
              "& .MuiToggleButton-root": {
                border: "none",
                px: 2,
                color: "#666",
                "&.Mui-selected": {
                  bgcolor: "#f0f0f0",
                  color: "#000",
                  fontWeight: "bold",
                },
                "&.Mui-disabled": {
                  opacity: 0.3
                }
              },
            }}
          >
            <ToggleButton value="SEA" disabled={!availableCategories.includes('SEA')}>SEA</ToggleButton>
            <ToggleButton value="AIR" disabled={!availableCategories.includes('AIR')}>AIR</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Extra Content from Layout Config */}
        {appbarConfig.extraContent && appbarConfig.extraContent.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mr: 2 }}>
            {appbarConfig.extraContent.map(renderExtraContent)}
          </Box>
        )}

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", color: appbarConfig.textColor || "#000" }}
          >
            Version: {process.env.REACT_APP_VERSION}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
    </>
  );
}

export default AppbarComponent;
