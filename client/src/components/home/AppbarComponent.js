import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography, keyframes } from "@mui/material";

const drawerWidth = 60;

// Keyframes for infinite scrolling from right to left
const scrollLeft = keyframes`
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
`;

function AppbarComponent(props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          ml: { lg: `${drawerWidth}px` },
          // Indian tricolor gradient - saffron from top-left, white center, green from bottom-right
          background: `
            radial-gradient(ellipse at top left, rgba(255, 153, 51, 0.85) 0%, rgba(255, 153, 51, 0.4) 25%, transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(19, 136, 8, 0.75) 0%, rgba(19, 136, 8, 0.3) 25%, transparent 50%),
            radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.7) 100%)
          `,
          backdropFilter: "blur(6px) !important",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar sx={{ minHeight: "65px !important" }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => props.setMobileOpen(!props.mobileOpen)}
            sx={{ mr: 2, display: { lg: "none" } }}
          >
            <MenuIcon sx={{ color: "#333" }} />
          </IconButton>

          <IconButton
            color="inherit"
            aria-label="go back"
            edge="start"
            onClick={() => window.history.back()}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon sx={{ color: "#333" }} />
          </IconButton>

          {/* Suraj Logo with Indian Flag */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "60px",
              minWidth: "180px",
              overflow: "hidden",
            }}
          >
            <img
              src={require("../../assets/images/suraj_logo_republic.png")}
              alt="Suraj Group - Republic Day"
              onClick={() => navigate("/")}
              style={{
                cursor: "pointer",
                maxHeight: "55px",
                width: "auto",
                objectFit: "contain",
                transform: "scale(2.0)",
                transformOrigin: "left center",
              }}
            />
          </Box>

          {/* Centered Republic Day Message */}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            {/* 77th Republic Day Logo */}
            <Box
              component="img"
              src={require("../../assets/images/republic_day_77_logo.png")}
              alt="77th Republic Day"
              sx={{
                height: { xs: "40px", sm: "50px", md: "55px" },
                objectFit: "contain",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "0.85rem", sm: "1rem", md: "1.2rem" },
                color: "#000080", // Ashok Chakra Navy Blue
                textAlign: "center",
                letterSpacing: "0.5px",
              }}
            >
              Happy Republic Day! May our collective efforts build a stronger India.
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: "600", color: "#333", fontSize: "0.75rem" }}
            >
              Version: {process.env.REACT_APP_VERSION}
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Scrolling Notice Bar - Only visible on homepage */}
      {isHomePage && (
        <Box
          sx={{
            position: "fixed",
            top: { xs: "56px", sm: "70px" },
            left: { lg: `${drawerWidth}px` },
            width: { lg: `calc(100% - ${drawerWidth}px)`, xs: "100%" },
            backgroundColor: "#1565C0",
            color: "#fff",
            py: 0.75,
            overflow: "hidden",
            zIndex: 1099,
            boxShadow: "0 2px 8px rgba(21, 101, 192, 0.3)",
          }}
        >
          <Box
            sx={{
              display: "inline-block",
              whiteSpace: "nowrap",
              animation: `${scrollLeft} 20s linear infinite`,
            }}
          >
            <Typography
              variant="body2"
              component="span"
              sx={{
                fontWeight: 500,
                fontSize: "0.875rem",
                letterSpacing: "0.3px",
              }}
            >
              📢 Please note: Custom operations will remain closed on 26th January. Since 24th and 25th are Saturday and Sunday, kindly complete all pending work by 23rd January.
            </Typography>
          </Box>
        </Box>)}
    </>
  );
}

export default AppbarComponent;
