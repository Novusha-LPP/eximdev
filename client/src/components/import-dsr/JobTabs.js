import * as React from "react";
import PropTypes from "prop-types";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ToolboxIcon from "@mui/icons-material/BuildCircle";
import JobList from "./JobList";
import ImportUtilityTool from "../import-utility-tool/ImportUtilityTool";
import { useSearchQuery } from "../../contexts/SearchQueryContext";
import { useLocation } from "react-router-dom";
import { useState } from "react";
import Badge from "@mui/material/Badge";

export const TabContext = React.createContext({
  currentTab: 0,
  setCurrentTab: () => {},
  navigate: () => {},
});

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}

function JobTabs() {
  const [value, setValue] = React.useState(0);
  const [openUtilityTool, setOpenUtilityTool] = React.useState(false);
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const location = useLocation();
  const { 
    setSearchQuery,
    setDetailedStatus,
    setSelectedICD,
    setSelectedImporter 
  } = useSearchQuery();

  // Handle tab restoration when returning from job details
  React.useEffect(() => {
    if (location.state?.fromJobDetails && location.state?.tabIndex !== undefined) {
      setValue(location.state.tabIndex);
      // Clear the state from history so it doesn't persist
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (event, newValue) => {
    // Clear search parameters when switching tabs
    setSearchQuery("");
    setDetailedStatus("all");
    setSelectedICD("all");
    setSelectedImporter("");
    setValue(newValue);
  };

  const handleOpenUtilityTool = () => {
    setOpenUtilityTool(true);
  };

  const handleCloseUtilityTool = () => {
    setOpenUtilityTool(false);
  };

  // Fetch unresolved count for Pending tab only
  React.useEffect(() => {
    async function fetchUnresolvedCount() {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_STRING}/25-26/jobs/Pending/all/all/all?page=1&limit=100&search=&unresolvedOnly=true`
        );
        const data = await res.json();
        setUnresolvedCount(data.total || 0);
      } catch (e) {
        setUnresolvedCount(0);
      }
    }
    fetchUnresolvedCount();
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: "divider",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Pending" {...a11yProps(0)} />
          <Tab label="Completed" {...a11yProps(1)} />
          <Tab label="Cancelled" {...a11yProps(2)} />
        </Tabs>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowUnresolvedOnly((prev) => !prev)}
              sx={{
                 borderRadius: 3,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0px)',
              },
              }}
            >
              {showUnresolvedOnly ? "Show All Jobs" : "Pending Queries"}
            </Button>
            <Badge 
              badgeContent={unresolvedCount} 
              color="error" 
              overlap="circular" 
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{ 
                position: 'absolute',
                top: -8,
                right: -8,
                '& .MuiBadge-badge': {
                  fontSize: '0.75rem',
                  minWidth: '18px',
                  height: '18px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }
              }}
            />
          </Box>
          
          <Button
            variant="contained"
            startIcon={<ToolboxIcon />}
            onClick={handleOpenUtilityTool}
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0px)',
              },
            }}
          >
            Utility Tool
          </Button>
        </Box>
      </Box>

      <CustomTabPanel value={value} index={0}>
        <JobList status="Pending" showUnresolvedOnly={showUnresolvedOnly} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <JobList status="Completed" showUnresolvedOnly={showUnresolvedOnly} />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <JobList status="Cancelled" showUnresolvedOnly={showUnresolvedOnly} />
      </CustomTabPanel>

      {/* Utility Tool Modal */}
      <Dialog
        open={openUtilityTool}
        onClose={handleCloseUtilityTool}
        maxWidth="lg"
        fullWidth
        sx={{
          "& .MuiDialog-paper": {
            width: "85%",
            height: "85%",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          borderBottom: 1,
          borderColor: "divider"
        }}>
          Import Utility Tool
          <IconButton
            onClick={handleCloseUtilityTool}
            sx={{ color: "grey.500" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 0 }}>
          <ImportUtilityTool />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default React.memo(JobTabs);