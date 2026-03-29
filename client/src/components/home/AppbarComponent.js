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
} from "@mui/material";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import axios from "axios";
import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { BranchContext } from "../../contexts/BranchContext.js";
import DOMPurify from "dompurify";

const drawerWidth = 60;
// Style tag ID for the theme CSS — ensures we can clean up on re-render
const THEME_STYLE_TAG_ID = "dynamic-navbar-theme-styles";

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

  // Active theme state
  const [activeTheme, setActiveTheme] = useState(null);
  const themeFetched = useRef(false);

  // Determine if we are in a job-specific view to disable branch switching
  const isJobView = useMemo(() => {
    return (
      pathname.includes("/job/") ||
      pathname.includes("/edit-do-") ||
      pathname.includes("/edit-billing-") ||
      pathname.includes("/edit-free-days-") ||
      pathname.includes("/view-job/") ||
      pathname.includes("/view-billing-job/") ||
      pathname.includes("/view-payment-request-job/") ||
      pathname.includes("/submission-job/") ||
      pathname.includes("/esanchit-job/") ||
      pathname.includes("/documentationJob/")
    );
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

  // Check which categories are available for the selected branch group
  const availableCategories = useMemo(() => {
    if (selectedBranchGroup === "all") return ["SEA", "AIR"];
    return branches
      .filter((b) => b.branch_code === selectedBranchGroup)
      .map((b) => b.category);
  }, [branches, selectedBranchGroup]);

  // --- Fetch Active Theme (once per session interval) ---
  useEffect(() => {
    if (themeFetched.current) return;
    themeFetched.current = true;

    const fetchActiveTheme = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/app-bar-themes/active`,
          { withCredentials: true }
        );
        setActiveTheme(res.data);
      } catch {
        // No active theme or API error — silently ignore
        setActiveTheme(null);
      }
    };

    fetchActiveTheme();

    // Refresh every 15 minutes so scheduled themes activate without page reload
    const interval = setInterval(fetchActiveTheme, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Inject theme CSS into <head> safely ---
  useEffect(() => {
    // Remove existing style tag
    const existing = document.getElementById(THEME_STYLE_TAG_ID);
    if (existing) existing.remove();

    if (!activeTheme?.css) return;

    // Scope the CSS to our theme zone
    const scopedCss = `#dynamic-navbar-theme { ${activeTheme.css || ""} }`;
    const styleTag = document.createElement("style");
    styleTag.id = THEME_STYLE_TAG_ID;
    styleTag.textContent = scopedCss;
    document.head.appendChild(styleTag);

    return () => {
      const tag = document.getElementById(THEME_STYLE_TAG_ID);
      if (tag) tag.remove();
    };
  }, [activeTheme]);

  // --- Compute theme styles for the AppBar ---
  const appBarSx = useMemo(() => {
    const base = {
      width: { lg: `calc(100% - ${drawerWidth}px)` },
      ml: { lg: `${drawerWidth}px` },
      boxShadow: "none",
    };

    if (activeTheme?.bgColor) {
      return {
        ...base,
        background: activeTheme.bgColor,
        backdropFilter: "none",
      };
    }

    return {
      ...base,
      backgroundColor: "rgba(249, 250, 251, 0.3)",
      backdropFilter: "blur(6px) !important",
    };
  }, [activeTheme]);

  // Sanitize theme HTML before injection
  const sanitizedThemeHtml = useMemo(() => {
    if (!activeTheme?.html) return null;
    return DOMPurify.sanitize(activeTheme.html, {
      ALLOWED_TAGS: [
        "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
        "img", "a", "strong", "em", "br", "ul", "li", "ol",
        "section", "article",
      ],
      ALLOWED_ATTR: ["class", "id", "src", "alt", "href", "style", "data-*"],
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    });
  }, [activeTheme]);

  const iconColor = activeTheme?.bgColor ? (activeTheme.textColor || "#fff") : "#000";

  return (
    <AppBar position="fixed" sx={appBarSx}>
      {/* ------ Dynamic Festival Banner Zone ------ */}
      {sanitizedThemeHtml && (
        <Box
          id="dynamic-navbar-theme"
          sx={{
            width: "100%",
            "--theme-bg": activeTheme?.bgColor || "#1976D2",
            "--theme-text": activeTheme?.textColor || "#fff",
            overflow: "hidden",
            // Smooth fade-in for the banner
            animation: "navThemeFadeIn 0.5s ease",
            "@keyframes navThemeFadeIn": {
              from: { opacity: 0, transform: "translateY(-8px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
          dangerouslySetInnerHTML={{ __html: sanitizedThemeHtml }}
        />
      )}

      {/* ------ Locked Core Toolbar (unchanged) ------ */}
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => props.setMobileOpen(!props.mobileOpen)}
          sx={{ mr: 2, display: { lg: "none" } }}
        >
          <MenuIcon sx={{ color: iconColor }} />
        </IconButton>

        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => window.history.back()}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon sx={{ color: iconColor }} />
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
              value={selectedBranchGroup}
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
              {(isAdmin || branches.length === 0) && (
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
                  opacity: 0.3,
                },
              },
            }}
          >
            <ToggleButton
              value="SEA"
              disabled={!availableCategories.includes("SEA")}
            >
              SEA
            </ToggleButton>
            <ToggleButton
              value="AIR"
              disabled={!availableCategories.includes("AIR")}
            >
              AIR
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", color: iconColor }}
          >
            Version: {process.env.REACT_APP_VERSION}
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;