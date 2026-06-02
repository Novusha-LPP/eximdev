import React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import { SwipeableDrawer } from "@mui/material";
import Sidebar from "./Sidebar";
import { useLayoutConfig } from "../../contexts/LayoutConfigContext.js";

function DrawerComponent(props) {
  const { layoutConfig } = useLayoutConfig();
  const sidebarConfig = layoutConfig?.sidebar || {};

  if (sidebarConfig.enabled === false) {
    return null;
  }

  const drawerWidth = sidebarConfig.width || 60;
  const bgColor = sidebarConfig.backgroundColor || "#111b21";
  const glassEffect = sidebarConfig.glassEffect || false;
  const borderRight = sidebarConfig.borderRight || "none";

  // Build background styles dynamically
  const backgroundStyles = {
    backgroundColor: glassEffect
      ? `${bgColor}cc`
      : bgColor,
    backdropFilter: glassEffect ? "blur(12px)" : "none",
    borderRight: borderRight,
  };

  // Only use background image if it's set and not "none"
  if (sidebarConfig.backgroundImage && sidebarConfig.backgroundImage !== "none") {
    try {
      const img = require(`../../assets/images/${sidebarConfig.backgroundImage}`);
      backgroundStyles.backgroundImage = `url(${img})`;
      backgroundStyles.backgroundAttachment = "fixed";
      backgroundStyles.backgroundPosition = "left 0 bottom 0 !important";
      backgroundStyles.backgroundSize = "250px !important";
      backgroundStyles.backgroundRepeat = "no-repeat";
    } catch {
      // Image not found, skip background image
    }
  }

  const drawerPaperStyles = {
    ...backgroundStyles,
    padding: drawerWidth > 80 ? "0 4px" : "0 10px",
  };

  const drawerStyles = {
    "& .MuiDrawer-paper": {
      boxSizing: "border-box",
      width: drawerWidth,
      transition: "width 0.3s ease",
    },
  };

  return (
    <Box
      component="nav"
      sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 }, transition: "width 0.3s ease" }}
      aria-label="mailbox folders"
    >
      {/* Drawer mobile */}
      <SwipeableDrawer
        PaperProps={{
          sx: drawerPaperStyles,
        }}
        variant="temporary"
        open={props.mobileOpen}
        onOpen={() => props.setMobileOpen(!props.mobileOpen)}
        onClose={() => props.setMobileOpen(!props.mobileOpen)}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{ ...drawerStyles, display: { xs: "block", lg: "none" } }}
      >
        <Sidebar drawerWidth={drawerWidth} />
      </SwipeableDrawer>

      {/* Drawer desktop */}
      <Drawer
        PaperProps={{
          sx: drawerPaperStyles,
        }}
        variant="permanent"
        sx={{
          ...drawerStyles,
          display: { xs: "none", lg: "block" },
        }}
        open
      >
        <Sidebar drawerWidth={drawerWidth} />
      </Drawer>
    </Box>
  );
}

export default DrawerComponent;
