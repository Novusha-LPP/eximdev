import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
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
import { useEffect, useState, useContext, useMemo } from "react";
import { BranchContext } from "../../contexts/BranchContext.js";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();
  const {
    selectedBranchGroup,
    setSelectedBranchGroup,
    selectedCategory,
    setSelectedCategory,
    branches,
  } = useContext(BranchContext);

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

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { lg: `calc(100% - ${drawerWidth}px)` },
        ml: { lg: `${drawerWidth}px` },
        backgroundColor: "rgba(249, 250, 251, 0.3)",
        backdropFilter: "blur(6px) !important",
        boxShadow: "none",
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => props.setMobileOpen(!props.mobileOpen)}
          sx={{ mr: 2, display: { lg: "none" } }}
        >
          <MenuIcon sx={{ color: "#000" }} />
        </IconButton>

        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={() => window.history.back()}
          sx={{ mr: 1 }}
        >
          <ArrowBackIcon sx={{ color: "#000" }} />
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
              sx={{
                bgcolor: "white",
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
              <MenuItem value="all">
                <em>All Branches</em>
              </MenuItem>
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
            sx={{
              bgcolor: "white",
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
              },
            }}
          >
            <ToggleButton value="SEA">SEA</ToggleButton>
            <ToggleButton value="AIR">AIR</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", color: "#000" }}
          >
            Version: {process.env.REACT_APP_VERSION}
          </Typography>
        </Box>
        {/* <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
            {process.env.REACT_APP_VERSION_DATE}
          </Typography> */}
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;