import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();

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
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;
