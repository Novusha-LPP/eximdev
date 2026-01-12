import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography, FormControl, Select, MenuItem } from "@mui/material";
import { useContext } from "react";
import { BranchContext } from "../../contexts/BranchContext";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();
  const { selectedBranch, setSelectedBranch } = useContext(BranchContext);
  const user = JSON.parse(localStorage.getItem("exim_user") || "{}");
  const isAdmin = user.role === "Admin";

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

        {/* Spacer to push the version text to the extreme right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Branch Selector and Version */}
        {isAdmin && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <FormControl
              size="small"
              sx={{
                minWidth: 240,
                backgroundColor: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              }}
            >
              <Select
                value={selectedBranch || "AHMEDABAD HO"}
                onChange={(e) => setSelectedBranch(e.target.value)}
                autoWidth={false}
                renderValue={(value) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ fontSize: '1.1rem' }}>
                      {value === "AHMEDABAD HO" ? "🏢" : "🏭"}
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "#1e293b",
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                )}
                sx={{
                  height: "42px",
                  borderRadius: "12px",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "rgba(0,0,0,0.12)",
                    borderWidth: "1px",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#6366f1",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#6366f1",
                    borderWidth: "2px",
                  },
                }}
              >
                <MenuItem value="AHMEDABAD HO" sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ fontSize: '1.2rem' }}>🏢</Box>
                    <Typography sx={{ fontWeight: 600 }}>AHMEDABAD HO</Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="GANDHIDHAM" sx={{ py: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ fontSize: '1.2rem' }}>🏭</Box>
                    <Typography sx={{ fontWeight: 600 }}>GANDHIDHAM</Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              borderLeft: "2px solid rgba(99, 102, 241, 0.2)",
              pl: 2.5
            }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  fontSize: "0.6rem"
                }}
              >
                System Version
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 900,
                  color: "#4f46e5",
                  lineHeight: 1.1,
                  fontSize: "0.9rem"
                }}
              >
                v{process.env.REACT_APP_VERSION}
              </Typography>
            </Box>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;
