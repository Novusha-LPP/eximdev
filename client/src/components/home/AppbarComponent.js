import React from "react";
import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Box, Typography, Select, MenuItem, FormControl } from "@mui/material";
import { UserContext } from "../../contexts/UserContext";
import { BranchContext } from "../../contexts/BranchContext";

const drawerWidth = 60;

function AppbarComponent(props) {
  const navigate = useNavigate();
  const { user } = React.useContext(UserContext);
  const { activeBranch, setActiveBranch, activeCategory, setActiveCategory } = React.useContext(BranchContext);

  const assignedBranches = user?.assigned_branches || [];
  const showBranchSelector = assignedBranches.length > 0;

  // Ensure we are working with names for the activeBranch state
  const currentBranchObj = assignedBranches.find((b) =>
    typeof b === 'object' ? b.branch_name === activeBranch : b === activeBranch
  ) || (typeof assignedBranches[0] === 'object' ? assignedBranches[0] : null);

  const availableCategories = currentBranchObj?.categories || ["SEA", "AIR"];
  const showCategorySelector = showBranchSelector && availableCategories.length > 1;

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

        {/* Spacer to push items to the right */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Branch / Category Selectors */}
        {showBranchSelector && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mr: 3 }}>
            <FormControl size="small" variant="outlined" sx={{ minWidth: 150 }}>
              <Select
                value={activeBranch || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setActiveBranch(val); // This now handles localStorage and isSwitching
                }}
                displayEmpty
                renderValue={(selected) => (
                  <span style={{ color: '#000', fontWeight: 'bold' }}>{selected || "Select Branch"}</span>
                )}
                sx={{
                  backgroundColor: '#fff',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.5)' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' },
                  '& .MuiSelect-icon': { color: '#000' }
                }}
              >
                {assignedBranches.map((b) => {
                  const branchName = typeof b === 'object' ? b.branch_name : b;
                  const branchId = typeof b === 'object' ? b._id : b;
                  return (
                    <MenuItem key={branchId} value={branchName} sx={{ color: '#000', fontWeight: 'bold' }}>
                      {branchName}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {showCategorySelector && (
              <FormControl size="small" variant="outlined" sx={{ minWidth: 100 }}>
                <Select
                  value={activeCategory || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setActiveCategory(val); // This now handles localStorage and isSwitching
                  }}
                  displayEmpty
                  renderValue={(selected) => (
                    <span style={{ color: '#000', fontWeight: 'bold' }}>{selected || "Category"}</span>
                  )}
                  sx={{
                    backgroundColor: '#fff',
                    borderRadius: 1,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.2)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' },
                    '& .MuiSelect-icon': { color: '#000' }
                  }}
                >
                  {availableCategories.map((cat) => (
                    <MenuItem key={cat} value={cat} sx={{ color: '#000', fontWeight: 'bold' }}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        )}

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography
            variant="body1"
            sx={{ fontWeight: "bold", color: "#000" }}
          >
            Version: {process.env.REACT_APP_VERSION}
          </Typography>
          {/* <Typography variant="body2" sx={{ color: "#666", mt: 0.5 }}>
            {process.env.REACT_APP_VERSION_DATE}
          </Typography> */}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default AppbarComponent;
